import base64
import io
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel
from PIL import Image
from ultralytics import YOLO

app = FastAPI(title="Leaf Disease ML Service")


class PredictRequest(BaseModel):
  imageBase64: str
  crop: Optional[str] = None


# These are the disease-key formats expected by the Node backend.
class_names = [
  "tomato_early_blight",
  "tomato_late_blight",
  "tomato_healthy",
  "potato_early_blight",
  "potato_late_blight",
  "potato_healthy",
  "pepper_bacterial_spot",
  "pepper_healthy",
]


yolo_model: Optional[YOLO] = None
yolo_class_names = class_names.copy()


def load_yolo():
  """
  Load the Ultralytics YOLO model from the newly trained path.
  """
  global yolo_model, yolo_class_names
  if yolo_model is not None:
    return

  weights_path = Path(__file__).parent / "runs" / "detect" / "model" / "new_leaf_model" / "weights" / "best.pt"
  if not weights_path.exists():
    print(f"WARNING: YOLO weights not found at {weights_path}. Using fallback classes.")
    yolo_model = None
    return

  yolo_model = YOLO(str(weights_path))

  # Ultralytics stores class names in model.names (dict or list)
  names = yolo_model.names
  if isinstance(names, dict):
    # Sort by class id to get stable ordering
    yolo_class_names = [names[i] for i in sorted(names.keys())]
  else:
    yolo_class_names = list(names)

  print(f"Loaded YOLO model from {weights_path}")
  print(f"YOLO classes: {yolo_class_names}")


def run_yolov4(img: Image.Image, crop_hint: Optional[str]):
  """
  Run Ultralytics YOLO model on a PIL image and return:
    { 'class_name': '<disease_key>', 'confidence': float }
  """
  load_yolo()

  # Fallback if model not loaded (weights missing)
  if yolo_model is None:
    crop_hint = (crop_hint or "").lower()
    dummy_class = class_names[0]
    if "potato" in crop_hint:
      dummy_class = "potato_early_blight"
    elif "pepper" in crop_hint or "bell pepper" in crop_hint or "capsicum" in crop_hint:
      dummy_class = "pepper_bacterial_spot"
    elif "tomato" in crop_hint:
      dummy_class = "tomato_early_blight"

    return {
      "class_name": dummy_class,
      "confidence": 0.7,
    }

  # Run prediction. Ultralytics accepts PIL Image directly.
  results = yolo_model(img, verbose=False)
  if not results:
    # No result object, fallback
    return {
      "class_name": class_names[0],
      "confidence": 0.5,
    }

  r = results[0]
  if r.boxes is None or len(r.boxes) == 0:
    # No detections
    return {
      "class_name": class_names[0],
      "confidence": 0.5,
    }

  boxes = r.boxes
  confs = boxes.conf.cpu().tolist()
  cls_ids = boxes.cls.cpu().tolist()

  # Take the detection with highest confidence
  best_idx = max(range(len(confs)), key=lambda i: confs[i])
  best_conf = float(confs[best_idx])
  best_cls_id = int(cls_ids[best_idx])

  # Map YOLO class name to our disease key format (lowercase, underscores)
  if 0 <= best_cls_id < len(yolo_class_names):
    raw_name = str(yolo_class_names[best_cls_id])
  else:
    raw_name = yolo_class_names[0]

  disease_key = raw_name.strip().lower().replace(" ", "_")

  return {
    "class_name": disease_key,
    "confidence": best_conf,
  }


import torch
from torchvision import models, transforms

resnet_model = None
resnet_class_names = []
resnet_transforms = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def load_resnet():
    global resnet_model, resnet_class_names
    if resnet_model is not None:
        return

    weights_path = Path(__file__).parent / "resnet_best.pth"
    classes_path = Path(__file__).parent / "resnet_classes.txt"

    if not weights_path.exists() or not classes_path.exists():
        print("WARNING: ResNet weights or classes not found. Using fallback.")
        return

    with open(classes_path, "r") as f:
        resnet_class_names = [line.strip() for line in f.readlines() if line.strip()]

    num_classes = len(resnet_class_names)
    
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    model = models.resnet18(weights=None)
    num_ftrs = model.fc.in_features
    model.fc = torch.nn.Linear(num_ftrs, num_classes)
    
    model.load_state_dict(torch.load(weights_path, map_location=device))
    model.eval()
    model = model.to(device)
    
    resnet_model = model
    print(f"Loaded ResNet model from {weights_path} with {num_classes} classes")

def run_resnet(img: Image.Image):
    load_resnet()
    if resnet_model is None:
        return None, 0.0

    device = next(resnet_model.parameters()).device
    
    input_tensor = resnet_transforms(img).unsqueeze(0).to(device)
    
    with torch.no_grad():
        outputs = resnet_model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        confidence, preds = torch.max(probabilities, 1)
        
    class_idx = preds.item()
    conf_val = confidence.item()
    
    if 0 <= class_idx < len(resnet_class_names):
        raw_name = resnet_class_names[class_idx]
    else:
        raw_name = "unknown"
        
    disease_key = raw_name.strip().lower().replace(" ", "_")
    return disease_key, conf_val

def decode_image(img_b64: str) -> Image.Image:
    raw = base64.b64decode(img_b64)
    return Image.open(io.BytesIO(raw)).convert("RGB")


@app.post("/predict")
def predict(req: PredictRequest):
    try:
        img = decode_image(req.imageBase64)
    except Exception as e:
        return {
            "success": False,
            "error": f"Could not decode image: {e}",
        }

    # 1. Run YOLO to find bounding box
    det = run_yolov4(img, req.crop)
    yolo_box = det.get("box") # Modification needed in run_yolov4 if we want accurate crops
    
    # 2. Run ResNet for final classification
    disease_key, confidence = run_resnet(img)
    
    if disease_key is None:
        disease_key = det["class_name"]
        confidence = float(det.get("confidence", 0.7))
    label = disease_key.replace("_", " ").title()

    severity = "mild"
    if confidence > 0.85:
        severity = "severe"
    elif confidence > 0.7:
        severity = "moderate"

    crop_name = (req.crop or "unknown").lower()
    if "tomato" in disease_key:
        crop_name = "tomato"
    elif "potato" in disease_key:
        crop_name = "potato"
    elif "pepper" in disease_key:
        crop_name = "pepper"

    return {
        "success": True,
        "crop": crop_name,
        "disease": disease_key,
        "label": label,
        "confidence": confidence,
        "severity": severity,
    }


@app.get("/health")
def health():
  # Try to load model (no-op if already loaded)
  load_yolo()
  weights_path = str(Path(__file__).parent / "runs" / "detect" / "model" / "new_leaf_model" / "weights" / "best.pt")
  return {
    "status": "ok",
    "model_loaded": yolo_model is not None,
    "weights_path": weights_path,
    "classes": yolo_class_names,
  }


if __name__ == "__main__":
  import uvicorn

  uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

