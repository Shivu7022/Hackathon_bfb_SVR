import os
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader

# Params
DATA_DIR = '../dataset' # Relative to ml-service folder
BATCH_SIZE = 32
NUM_EPOCHS = 5
LEARNING_RATE = 0.001

class SafeImageFolder(datasets.ImageFolder):
    def __init__(self, root, transform=None):
        # ImageFolder throws if any directory has no valid images.
        # So we filter out empty directories first.
        self.valid_classes = []
        for d in os.listdir(root):
            if os.path.isdir(os.path.join(root, d)):
                has_images = any(f.lower().endswith(('.png', '.jpg', '.jpeg', '.JPG', '.JPEG')) for root_d, dirs, files in os.walk(os.path.join(root, d)) for f in files)
                if has_images:
                    self.valid_classes.append(d)
                else:
                    print(f"Skipping empty class directory: {d}")
        
        super().__init__(root, transform=transform)

    def find_classes(self, directory):
        self.valid_classes.sort()
        class_to_idx = {cls_name: i for i, cls_name in enumerate(self.valid_classes)}
        return self.valid_classes, class_to_idx

def train_resnet():
    print("Setting up data transforms...")
    data_transforms = {
        'train': transforms.Compose([
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    print("Loading datasets...")
    image_datasets = {
        'train': SafeImageFolder(os.path.join(DATA_DIR, 'train'), transform=data_transforms['train']),
        'val': SafeImageFolder(os.path.join(DATA_DIR, 'val'), transform=data_transforms['val'])
    }
    
    dataloaders = {
        'train': DataLoader(image_datasets['train'], batch_size=BATCH_SIZE, shuffle=True, num_workers=4),
        'val': DataLoader(image_datasets['val'], batch_size=BATCH_SIZE, shuffle=False, num_workers=4)
    }

    dataset_sizes = {x: len(image_datasets[x]) for x in ['train', 'val']}
    class_names = image_datasets['train'].classes
    num_classes = len(class_names)
    
    print(f"Loaded {num_classes} classes: {class_names}")
    
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    print("Initializing ResNet18...")
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, num_classes)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

    # Save class names for inference later
    with open("resnet_classes.txt", "w") as f:
        f.write("\n".join(class_names))

    print(f"Starting training for {NUM_EPOCHS} epochs...")
    best_acc = 0.0
    
    for epoch in range(NUM_EPOCHS):
        print(f'Epoch {epoch+1}/{NUM_EPOCHS}')
        print('-' * 10)

        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()
            else:
                model.eval()

            running_loss = 0.0
            running_corrects = 0

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)

                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)

            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc = running_corrects.double() / dataset_sizes[phase]

            print(f'{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}')

            if phase == 'val' and epoch_acc > best_acc:
                best_acc = epoch_acc
                torch.save(model.state_dict(), 'resnet_best.pth')

        print()

    print(f'Training complete. Best val Acc: {best_acc:4f}')
    print("Saved best model weights to resnet_best.pth")

if __name__ == '__main__':
    train_resnet()
