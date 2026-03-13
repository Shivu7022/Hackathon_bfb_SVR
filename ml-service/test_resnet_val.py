import os
import random
import torch
from torchvision import models, transforms
from PIL import Image

def test_on_val():
    weights_path = "resnet_best.pth"
    classes_path = "resnet_classes.txt"
    val_dir = "../dataset/val"
    
    if not os.path.exists(weights_path) or not os.path.exists(classes_path):
        print("Model or classes file missing.")
        return
        
    with open(classes_path, "r") as f:
        class_names = [line.strip() for line in f.readlines() if line.strip()]

    num_classes = len(class_names)
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    model = models.resnet18(weights=None)
    num_ftrs = model.fc.in_features
    model.fc = torch.nn.Linear(num_ftrs, num_classes)
    model.load_state_dict(torch.load(weights_path, map_location=device))
    model.eval()
    model = model.to(device)

    data_transforms = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    print("\n--- Testing 3 Random Images per Class from Validation Set ---\n")
    
    correct = 0
    total = 0

    for cls_name in class_names:
        cls_dir = os.path.join(val_dir, cls_name)
        if not os.path.isdir(cls_dir):
            continue
            
        images = [f for f in os.listdir(cls_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if not images:
            continue
            
        # Pick up to 3 random images for testing
        test_images = random.sample(images, min(3, len(images)))
        
        for img_name in test_images:
            img_path = os.path.join(cls_dir, img_name)
            try:
                img = Image.open(img_path).convert('RGB')
                input_tensor = data_transforms(img).unsqueeze(0).to(device)
                
                with torch.no_grad():
                    outputs = model(input_tensor)
                    probabilities = torch.nn.functional.softmax(outputs, dim=1)
                    confidence, preds = torch.max(probabilities, 1)
                    
                pred_class = class_names[preds.item()]
                conf_val = confidence.item()
                
                total += 1
                if pred_class == cls_name:
                    correct += 1
                    status = "✅ PASS"
                else:
                    status = "❌ FAIL"
                    
                print(f"{status} | True: {cls_name[:20]:20s} | Pred: {pred_class[:20]:20s} | Conf: {conf_val:.2f}")

            except Exception as e:
                print(f"Error processing {img_path}: {e}")

    print(f"\nOverall sample accuracy: {correct}/{total} ({(correct/total)*100 if total > 0 else 0:.2f}%)")

if __name__ == "__main__":
    test_on_val()
