# Smart Leaf Doctor

This repository contains the Smart Leaf Doctor application, which analyzes crop leaf images to detect diseases and provide recommendations. It comprises a frontend UI, a Node.js backend, and a Python FastAPI Machine Learning service powered by YOLO and ResNet models.

## Project Structure

- `frontend/`: Vanilla HTML/CSS/JS web interface.
- `backend/`: Node.js Express server handling API requests, weather data fetching, and business logic.
- `ml-service/`: Python FastAPI service for running image inference using YOLO (for bounding boxes) and a custom-trained ResNet model (for classification).
- `dataset/`: (Ignored in Git) Folder containing the training dataset.

## Prerequisites

- Node.js (v14 or higher)
- Python (3.10+ recommended)
- `npm` and `pip`

## How to Run the Application

You will need to open **three separate terminals** to run all services simultaneously.

### 1. ML Service (Terminal 1)
This service handles the AI predictions.

```bash
cd ml-service
```
*(Optional but recommended)* Create and activate a virtual environment:
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt

# If you have an NVIDIA GPU, install the CUDA-enabled version of PyTorch:
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 --upgrade
```

Start the FastAPI server (runs on port 8002):
```bash
python main.py
# OR
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### 2. Node Backend (Terminal 2)
This service acts as the bridge between the frontend and the ML service, and fetches weather data.

```bash
cd backend
```

Install Node modules:
```bash
npm install
```

Configure Environment Variables:
Create a `.env` file in the `backend/` directory and add your OpenWeather API key (optional, for weather features):
```env
OPENWEATHER_API_KEY=your_api_key_here
PORT=4000
```

Start the backend server (runs on port 4000):
```bash
npm start
```

### 3. Frontend (Terminal 3)
Serve the client-facing web application.

```bash
cd frontend
```

You can serve the folder using `npx serve` (runs on port 3000):
```bash
npx serve .
```
Alternatively, if you have Python installed, you can use:
```bash
python -m http.server 3000
```

### 4. Access the App
Open your web browser and navigate to the address where the frontend is being served (usually `http://localhost:3000`).

Upload an image of a leaf (e.g., tomato, potato, or pepper), select the crop type conceptually in your head (the model will infer or you can pass crop hints if implemented), and click **Analyze & Recommend**.
