<div align="center">

# 🌿 Smart Leaf Doctor

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-GPU-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.11x-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> **AI-powered crop disease detection and recommendation system for farmers** — powered by a custom-trained ResNet18 model (95%+ accuracy) with real-time GPS weather integration and multilingual chat support.

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔬 **AI Disease Detection** | Custom-trained ResNet18 model on PlantVillage dataset — 95.3% validation accuracy |
| 📍 **GPS Location** | One-tap GPS detection from mobile browser for weather-aware recommendations |
| 🌦️ **Live Weather** | OpenWeather API integration to adapt spray intervals to local conditions |
| 💊 **Pesticide Recommendations** | Precise dosage, spray intervals, and safety precautions per disease |
| 🤖 **Multilingual KrishiBot** | Chat assistant responding in English, Hindi, Kannada, Tamil, Marathi & Punjabi |
| 🌿 **Multi-Crop Support** | Detects diseases across Tomato, Potato, and Pepper plants (15 disease classes) |
| 📷 **Mobile Camera** | Capture leaf images directly from phone camera or upload from gallery |

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌───────────────────────────┐
│                 │     │                      │     │                           │
│   Frontend      │────▶│   Node.js Backend    │────▶│   Python ML Service       │
│   HTML/CSS/JS   │     │   Express (Port 4000)│     │   FastAPI (Port 8002)     │
│   (Port 3000)   │     │                      │     │                           │
│                 │     │  • Recommendation     │     │  • YOLO Object Detection  │
│  • Camera/GPS   │     │    Engine            │     │  • ResNet18 Classification │
│  • KrishiBot UI │     │  • Weather API        │     │  • GPU Accelerated (CUDA) │
│  • Results View │     │  • Chat Translations  │     │                           │
└─────────────────┘     └──────────────────────┘     └───────────────────────────┘
```

---

## 🦠 Supported Diseases

<details>
<summary><b>🍅 Tomato (8 diseases)</b></summary>

- Early Blight
- Late Blight
- Leaf Mold
- Septoria Leaf Spot
- Spider Mites (Two-Spotted)
- Target Spot
- Yellow Leaf Curl Virus
- Mosaic Virus

</details>

<details>
<summary><b>🥔 Potato (2 diseases)</b></summary>

- Early Blight
- Late Blight

</details>

<details>
<summary><b>🌶️ Pepper (1 disease)</b></summary>

- Bacterial Spot

</details>

---

## 🚀 Getting Started

> You need **3 terminals** running simultaneously.

### Pre-requisites

- [Node.js](https://nodejs.org) v14+
- [Python](https://python.org) 3.10+
- NVIDIA GPU (optional, for faster inference)

---

### Terminal 1 — ML Service

```bash
cd ml-service

# Install dependencies
pip install -r requirements.txt

# If you have an NVIDIA GPU (recommended):
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 --upgrade

# Start the model server on port 8002
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### Terminal 2 — Node Backend

```bash
cd backend

npm install

# (Optional) Create .env to add OpenWeather API key for live weather:
# OPENWEATHER_API_KEY=your_key_here

npm start
```

### Terminal 3 — Frontend

```bash
cd frontend

npx serve .
```

Then open **http://localhost:3000** in your browser 🎉

---

## 📱 How to Use

1. **Select your crop** (Tomato, Potato, Pepper)
2. **Tap 📍 Detect My Location** to auto-fill GPS coordinates (mobile)
3. **Capture a leaf image** using your phone camera or upload from gallery
4. **Click Analyze & Recommend** to get:
   - Disease name & confidence score
   - Severity level
   - Pesticide name, dosage, and spray schedule
   - Weather-adjusted interval if connected
5. **Chat with KrishiBot** in your language for follow-up advice

---

## 🧠 Model Details

<details>
<summary><b>ResNet18 Training Summary</b></summary>

| Parameter | Value |
|---|---|
| Architecture | ResNet18 |
| Dataset | PlantVillage (local subset) |
| Classes | 15 disease categories |
| Epochs | 5 |
| Best Validation Accuracy | ~95.3% |
| Sample Accuracy (val set) | 86.67% (39/45) |
| GPU | NVIDIA CUDA 11.8 |
| Optimizer | SGD with momentum |
| Loss | CrossEntropy |

</details>

---

## 🌍 Multilingual Support

KrishiBot supports responses in:

| Language | Code |
|---|---|
| 🇮🇳 Hindi | `hi` |
| 🇮🇳 Kannada | `kn` |
| 🇮🇳 Tamil | `ta` |
| 🇮🇳 Marathi | `mr` |
| 🇮🇳 Punjabi | `pa` |
| 🌐 English | `en` |

---

## 📁 Project Structure

```
Hackathon2/
├── frontend/           # Vanilla HTML/CSS/JS web app
│   ├── index.html      # UI with camera, GPS, crop selector
│   └── app.js          # Frontend logic & API calls
│
├── backend/            # Node.js Express server
│   └── src/
│       ├── server.js              # API routes & ML client
│       └── recommendationEngine.js # Disease → pesticide rules
│
├── ml-service/         # Python FastAPI ML service
│   ├── main.py         # FastAPI app with YOLO + ResNet pipeline
│   ├── train_resnet.py # ResNet18 training script (GPU)
│   ├── train.py        # YOLO training script
│   └── requirements.txt
│
└── README.md
```

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

<div align="center">

Made with ❤️ for farmers 🌾 | Built for BFB Hackathon

</div>
