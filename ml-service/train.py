import os
import urllib.request
import zipfile
from ultralytics import YOLO

# A small public dataset for leaf disease detection in YOLOv8 format (Roboflow)
# This is a placeholder URL for a sample dataset. In a real scenario, this would be a valid Roboflow/Kaggle link.
# We will use a smaller proxy dataset or download one from a direct URL.
DATASET_URL = "https://github.com/ultralytics/yolov5/releases/download/v1.0/coco128.zip" 
DATASET_ZIP = "dataset.zip"

def download_and_extract(url, zip_path, extract_dir):
    print(f"Downloading dataset from {url}...")
    urllib.request.urlretrieve(url, zip_path)
    print("Extracting dataset...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)
    print("Extraction complete.")
    os.remove(zip_path)

def train_model():
    print("Initializing YOLOv8 model for training...")
    # Load a pretrained YOLOv8 model
    model = YOLO("yolov8n.pt") 

    # For this hackathon demo, we will use the coco128 dataset as a placeholder
    # In a real use-case, we would point 'data' to the data.yaml of the leaf disease dataset
    print("Starting training (this may take a while depending on hardware)...")
    results = model.train(
        data="coco128.yaml", # Point to the dataset YAML file
        epochs=3, # Low epoch count for speed during hackathon
        imgsz=320, # Smaller image size for faster training
        project="model",
        name="new_leaf_model"
    )
    
    print("Training complete!")
    print(f"Best model weights saved to: {results.save_dir}/weights/best.pt")

if __name__ == "__main__":
    # If using a custom dataset ZIP, uncomment the following:
    # download_and_extract(DATASET_URL, DATASET_ZIP, "dataset")
    
    train_model()
