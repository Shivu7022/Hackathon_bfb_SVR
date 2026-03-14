import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildRecommendation } from "./recommendationEngine.js";

dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 4000;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "YOUR_OPENWEATHER_KEY_HERE";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const HISTORY_FILE = path.join(process.cwd(), "history.json");

// Ensure history file exists
if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
}

function saveToHistory(record) {
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    data.unshift({ ...record, timestamp: new Date().toISOString() });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data.slice(0, 50), null, 2));
  } catch (err) {
    console.error("Error saving to history:", err);
  }
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

app.use(cors());
app.use(express.json({ limit: "10mb" }));

function classifyLeafStub(imageBase64, crop) {
  const lowerCrop = (crop || "").toLowerCase();
  if (lowerCrop.includes("tomato")) {
    return {
      crop: "tomato",
      disease: "early_blight",
      label: "Tomato Early Blight",
      confidence: 0.9,
      severity: "moderate"
    };
  }
  if (lowerCrop.includes("rice")) {
    return {
      crop: "rice",
      disease: "blast",
      label: "Rice Blast",
      confidence: 0.88,
      severity: "mild"
    };
  }
  return {
    crop: lowerCrop || "unknown",
    disease: "unknown",
    label: "Unknown leaf issue",
    confidence: 0.5,
    severity: "mild"
  };
}

async function classifyLeaf(imageBase64, crop, extra = {}) {
  const { location, soil } = extra || {};
  try {
    // Call existing FastAPI predict endpoint
    const url = `${ML_SERVICE_URL}/predict`;
    const payload = {
      imageBase64: imageBase64,
      crop: crop || "unknown"
    };

    const res = await axios.post(url, payload, { timeout: 15000 });
    if (res.data) {
      const raw = res.data;
      const disease =
        raw.disease_key ||
        raw.disease ||
        raw.label ||
        raw.predicted_disease ||
        "unknown";
      const label = raw.label || disease;
      const confidence =
        typeof raw.confidence === "number"
          ? raw.confidence
          : typeof raw.probability === "number"
            ? raw.probability
            : 0.7;
      const severity =
        typeof raw.severity === "string"
          ? raw.severity.toLowerCase()
          : confidence > 0.85
            ? "severe"
            : confidence > 0.7
              ? "moderate"
              : "mild";

      return {
        crop: raw.crop || crop || "unknown",
        disease,
        label,
        confidence,
        severity,
        source: "ml-service",
        raw
      };
    }
    console.warn("ML /predict returned empty body, falling back to stub.");
  } catch (err) {
    console.error(
      "Error calling ML /predict, falling back to stub:",
      err.message
    );
  }
  const stub = classifyLeafStub(imageBase64, crop);
  return { ...stub, source: "stub" };
}

async function fetchWeather(lat, lon) {
  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === "YOUR_OPENWEATHER_KEY_HERE") {
    return null;
  }
  if (typeof lat !== "number" || typeof lon !== "number") {
    return null;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const res = await axios.get(url);
    const list = res.data.list || [];
    if (!list.length) return null;

    const now = list[0];
    const humidity = now.main?.humidity ?? null;
    const temperature = now.main?.temp ?? null;

    const next12h = list.slice(0, 4);
    const rainExpected = next12h.some((entry) => {
      return !!(entry.rain && (entry.rain["3h"] || entry.rain["1h"]));
    });

    return { humidity, temperature, rainExpected };
  } catch (err) {
    console.error("Error fetching weather from OpenWeather:", err.message);
    return null;
  }
}

app.post("/api/predict-and-recommend", async (req, res) => {
  try {
    const { imageBase64, crop, location, soil, userId, history } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    const mlResult = await classifyLeaf(imageBase64, crop, { location, soil });
    const { crop: detectedCrop, disease, label, confidence, severity, source } = mlResult;

    let weather = null;
    if (location && typeof location.lat === "number" && typeof location.lon === "number") {
      weather = await fetchWeather(location.lat, location.lon);
    }

    const recommendation = buildRecommendation({
      crop: detectedCrop || crop,
      disease,
      severity,
      weather,
      soil,
      history: Array.isArray(history) ? history : []
    });

    const finalResult = {
      success: true,
      mlResult: {
        crop: detectedCrop,
        disease,
        label,
        confidence,
        severity,
        source
      },
      weather,
      recommendation
    };

    // Persist to history
    saveToHistory({
      crop: detectedCrop || crop,
      disease: label,
      severity,
      region: location?.region || "Local Farm",
      weather,
      recommendation
    });

    return res.json(finalResult);
  } catch (err) {
    console.error("Error in /api/predict-and-recommend:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});



const KARNATAKA_DISTRICTS = {
  "Bengaluru Rural": { lat: 13.2503, lon: 77.2982 },
  "Mysuru": { lat: 12.2958, lon: 76.6394 },
  "Belagavi": { lat: 15.8497, lon: 74.4977 },
  "Dharwad": { lat: 15.4589, lon: 75.0078 },
  "Raichur": { lat: 16.2120, lon: 77.3439 },
  "Shimoga": { lat: 13.9298, lon: 75.5681 }
};

app.get("/api/weather", async (req, res) => {
  const districtName = req.query.district || "Bengaluru Rural";
  const coords = KARNATAKA_DISTRICTS[districtName];

  if (!coords) {
    return res.status(404).json({ success: false, error: "District not found in Karnataka mapping" });
  }

  const weather = await fetchWeather(coords.lat, coords.lon);
  if (!weather) {
    return res.status(500).json({ success: false, error: "Failed to fetch weather data" });
  }

  // Add simulated sensor data for dashboard
  const sensorData = {
    ...weather,
    soilMoisture: Math.floor(Math.random() * (60 - 30) + 30),
    lightIntensity: Math.floor(Math.random() * (1000 - 400) + 400),
    district: districtName
  };

  return res.json({ success: true, data: sensorData });
});

app.post("/api/chat", (req, res) => {
  const { message, language, context } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  const lang = (language || "en").toLowerCase();

  const disease = context?.recommendation?.diseaseLabel || "the crop";
  const interval = context?.recommendation?.intervalDays || 7;
  const pesticide = context?.recommendation?.pesticide || "recommended pesticide";

  let replyEn = `For ${disease}, spray ${pesticide} every ${interval} days as advised. Do not exceed the recommended dose and avoid spraying in strong wind or rain.`;

  if (lang === "hi") {
    replyEn =
      `इस बीमारी (${disease}) के लिए, ${interval} दिन के अंतर पर ${pesticide} का छिड़काव करें। ` +
      `दवा की मात्रा न बढ़ाएँ और तेज हवा या बारिश में छिड़काव न करें।`;
  } else if (lang === "kn") {
    replyEn =
      `ಈ ರೋಗ (${disease})ಗಾಗಿ, ${interval} ದಿನಗಳಿಗೊಮ್ಮೆ ${pesticide} ಔಷಧಿಯನ್ನು ಶಿಫಾರಸು ಮಾಡಿದ ಪ್ರಮಾಣದಲ್ಲಿ ಸಿಂಪಡಿಸಿ. ` +
      `ಮಾತ್ರೆಯನ್ನು ಹೆಚ್ಚಿಸಬೇಡಿ ಮತ್ತು ಭಾರೀ ಗಾಳಿ ಅಥವಾ ಮಳೆಯಲ್ಲಿ ಸಿಂಪಡನೆ ಮಾಡಬೇಡಿ.`;
  } else if (lang === "ta") {
    replyEn =
      `இந்த நோய் (${disease})க்காக, ${interval} நாட்களுக்கு ஒருமுறை ${pesticide} மருந்தை பரிந்துரைக்கப்பட்ட அளவில் தெளிக்கவும். ` +
      `அளவை அதிகரிக்க வேண்டாம், பலமான காற்று அல்லது மழையில் தெளிக்க வேண்டாம்.`;
  } else if (lang === "mr") {
    replyEn =
      `या रोगासाठी (${disease}), ${interval} दिवसांच्या अंतराने ${pesticide} चे फवारणी करा. ` +
      `औषधाचे प्रमाण वाढवू नका आणि जोरदार वारा किंवा पावसात फवारणी करू नका.`;
  } else if (lang === "pa") {
    replyEn =
      `ਇਸ ਬਿਮਾਰੀ (${disease}) ਲਈ, ${interval} ਦਿਨਾਂ ਦੇ ਅੰਤਰ 'ਤੇ ${pesticide} ਦੀ ਸਿਫਾਰਸ਼ੀ ਮਾਤਰਾ ਨਾਲ ਛਿੜਕਾਓ ਕਰੋ। ` +
      `ਮਾਤਰਾ ਨਾ ਵਧਾਓ ਅਤੇ ਤੇਜ਼ ਹਵਾ ਜਾਂ ਮੀਂਹ ਵਿੱਚ ਛਿੜਕਾਓ ਨਾ ਕਰੋ।`;
  }

  return res.json({
    success: true,
    reply: replyEn
  });
});

app.get("/api/history", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    res.json({ success: true, history: data });
  } catch (err) {
    res.status(500).json({ error: "Failed to read history" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/** Gemini-powered farming assistant */
app.post("/api/gemini", async (req, res) => {
  const { message, context } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  if (!genAI) {
    return res.status(503).json({
      error: "Gemini API key not configured. Set GEMINI_API_KEY environment variable."
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Build a system context preamble
    const systemContext = `You are KrishiBot, a friendly and knowledgeable AI assistant for Indian farmers.
- Respond in simple, clear language a farmer can understand.
- If the farmer writes in Hindi, Kannada, Tamil, Marathi, or Punjabi, respond in that same language.
- Focus on practical, actionable farming advice about crops, diseases, pesticides, weather, and soil.
- Keep responses concise (2-4 sentences) unless the topic requires more detail.
${context?.diseaseLabel
        ? `- The farmer is dealing with: ${context.diseaseLabel} on their ${context.crop || "crop"}. Severity: ${context.severity || "mild"}. Recommended pesticide: ${context.pesticide || "unknown"}.`
        : ""
      }`;

    const fullPrompt = `${systemContext}\n\nFarmer: ${message}\n\nKrishiBot:`;

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    return res.json({ success: true, reply: text.trim() });
  } catch (err) {
    console.error("Gemini API error:", err.message);
    return res.status(500).json({ error: "Failed to get response from Gemini: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});

