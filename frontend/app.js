// const backendBaseUrl = "http://localhost:4000";
// const backendBaseUrl = "https://long-papayas-push.loca.lt";
const backendBaseUrl = "http://10.69.91.198:4000";


const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const preview = document.getElementById("preview");
const fileInput = document.getElementById("file-input");
const btnStartCamera = document.getElementById("btn-start-camera");
const btnCapture = document.getElementById("btn-capture");
const btnAnalyze = document.getElementById("btn-analyze");
const btnGps = document.getElementById("btn-gps");
const gpsStatus = document.getElementById("gps-status");
const resultDiv = document.getElementById("result");
const cropSelect = document.getElementById("crop");
const latInput = document.getElementById("lat");
const lonInput = document.getElementById("lon");
const soilPhInput = document.getElementById("soil-ph");
const soilNSelect = document.getElementById("soil-n");
const languageSelect = document.getElementById("language");
const chatWindow = document.getElementById("chat-window");
const chatInput = document.getElementById("chat-input");
const btnSendChat = document.getElementById("btn-send-chat");

let currentImageBase64 = null;
let currentContext = null;
let mediaStream = null;

/** Detect GPS location using the browser Geolocation API */
function detectGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      gpsStatus.textContent = "⚠️ Geolocation is not supported by your browser.";
      gpsStatus.style.color = "#f87171";
      reject(new Error("Geolocation not supported"));
      return;
    }

    if (btnGps) {
      btnGps.textContent = "⏳ Detecting location...";
      btnGps.disabled = true;
    }
    gpsStatus.textContent = "Waiting for GPS signal...";
    gpsStatus.style.color = "#9ca3af";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const acc = Math.round(position.coords.accuracy);

        if (latInput) latInput.value = lat.toFixed(6);
        if (lonInput) lonInput.value = lon.toFixed(6);

        gpsStatus.textContent = `✅ Location detected: ${lat.toFixed(4)}, ${lon.toFixed(4)} (±${acc}m)`;
        gpsStatus.style.color = "#4ade80";

        if (btnGps) {
          btnGps.textContent = "📍 Detect My Location (GPS)";
          btnGps.disabled = false;
        }
        resolve({ lat, lon });
      },
      (err) => {
        let msg = "GPS error: ";
        switch (err.code) {
          case err.PERMISSION_DENIED: msg += "Location permission denied. Please allow it in browser settings."; break;
          case err.POSITION_UNAVAILABLE: msg += "Location unavailable. Try outdoors or check device settings."; break;
          case err.TIMEOUT: msg += "GPS timed out. Try again."; break;
          default: msg += err.message;
        }
        gpsStatus.textContent = "⚠️ " + msg;
        gpsStatus.style.color = "#f87171";

        if (btnGps) {
          btnGps.textContent = "📍 Detect My Location (GPS)";
          btnGps.disabled = false;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,   // Use GPS chip on mobile
        timeout: 15000,             // 15s timeout
        maximumAge: 60000           // Accept cached position up to 1 min old
      }
    );
  });
}

async function startCamera() {
  try {
    if (mediaStream) {
      return;
    }
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    video.srcObject = mediaStream;
  } catch (err) {
    console.error("Error starting camera", err);
    alert("Unable to access camera. Please allow camera permission in your browser.");
  }
}

function captureFrame() {
  if (!video.videoWidth) {
    alert("Camera is not ready yet. Please wait a moment and try again.");
    return;
  }
  const w = video.videoWidth;
  const h = video.videoHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  currentImageBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");

  preview.src = dataUrl;
  preview.style.display = "block";
}

function handleFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    if (typeof dataUrl === "string") {
      currentImageBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      preview.src = dataUrl;
      preview.style.display = "block";
    }
  };
  reader.onerror = () => {
    console.error("Error reading file");
    alert("Could not read image file. Please try another image.");
  };
  reader.readAsDataURL(file);
}

async function analyzeImage() {
  if (!currentImageBase64) {
    alert("Please capture a leaf image first.");
    return;
  }
  const crop = cropSelect.value;
  const lat = parseFloat(latInput.value);
  const lon = parseFloat(lonInput.value);
  const soilPh = soilPhInput.value ? parseFloat(soilPhInput.value) : null;
  const soilN = soilNSelect.value;

  const payload = {
    imageBase64: currentImageBase64,
    crop,
    location:
      !isNaN(lat) && !isNaN(lon)
        ? { lat, lon }
        : null,
    soil: {
      ph: soilPh,
      nitrogenLevel: soilN
    },
    userId: "demo-user-1"
  };

  // If lat/lon are still empty, try to auto-detect GPS silently
  if (isNaN(lat) || isNaN(lon)) {
    try {
      const coords = await detectGPS();
      payload.location = { lat: coords.lat, lon: coords.lon };
    } catch (_) {
      // GPS failed — proceed without location
    }
  }

  resultDiv.textContent = "Analyzing leaf and fetching weather...";
  try {
    const res = await fetch(`${backendBaseUrl}/api/predict-and-recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error("Server error");
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Unknown error");
    }

    currentContext = data;
    renderResult(data);
    appendChatMessage(
      "bot",
      "Diagnosis ready. You can ask follow-up questions in your language."
    );
  } catch (err) {
    console.error("Error analyzing image", err);
    resultDiv.textContent =
      "Failed to analyze. Please check backend is running on port 4000 and try again.";
  }
}

function renderResult(data) {
  const { mlResult, weather, recommendation } = data;
  let html = "";
  if (mlResult) {
    html += `<div><span class="pill">Disease</span> <strong>${mlResult.label}</strong> (${mlResult.disease})</div>`;
    html += `<div style="margin-top:4px;font-size:0.8rem;">Confidence ~ ${(mlResult.confidence * 100).toFixed(
      1
    )}% &nbsp; | &nbsp; Severity: ${mlResult.severity}</div>`;
  }
  if (weather) {
    html += `<div style="margin-top:6px;"><span class="pill">Weather</span> Temp: ${weather.temperature ?? "NA"
      }°C, Humidity: ${weather.humidity ?? "NA"}%, Rain soon: ${weather.rainExpected ? "Yes" : "No/Unknown"
      }</div>`;
  } else {
    html += `<div style="margin-top:6px;"><span class="pill">Weather</span> Weather data not available (missing API key or location).</div>`;
  }
  if (recommendation) {
    html += `<div style="margin-top:10px;"><span class="pill">Recommendation</span></div>`;
    html += `<div style="margin-top:4px;">Use <strong>${recommendation.pesticide}</strong> at <strong>${recommendation.dosePerLitreMl
      } ml/litre</strong> of water.</div>`;
    html += `<div>Spray every <strong>${recommendation.intervalDays} days</strong> for about <strong>${recommendation.sprays
      } sprays</strong>, adjusting based on field observation.</div>`;
    if (recommendation.precautions && recommendation.precautions.length) {
      html += `<ul style="margin-top:4px;padding-left:18px;font-size:0.8rem;">${recommendation.precautions
        .map((p) => `<li>${p}</li>`)
        .join("")}</ul>`;
    }
    if (recommendation.explanation) {
      html += `<div style="margin-top:6px;font-size:0.8rem;color:#9ca3af;">${recommendation.explanation}</div>`;
    }
  }

  resultDiv.innerHTML = html;
}

function appendChatMessage(who, text) {
  const div = document.createElement("div");
  div.className = "msg " + (who === "user" ? "msg-user" : "msg-bot");
  div.textContent = (who === "user" ? "You: " : "KrishiBot: ") + text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  appendChatMessage("user", text);
  chatInput.value = "";

  try {
    const res = await fetch(`${backendBaseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        language: languageSelect.value,
        context: currentContext || {}
      })
    });
    if (!res.ok) {
      throw new Error("Chat server error");
    }
    const data = await res.json();
    appendChatMessage("bot", data.reply || "No reply");
  } catch (err) {
    console.error("Error in chat", err);
    appendChatMessage("bot", "Chat failed. Please ensure backend is running.");
  }
}

btnStartCamera?.addEventListener("click", startCamera);
btnCapture?.addEventListener("click", captureFrame);
fileInput?.addEventListener("change", handleFileUpload);
btnAnalyze?.addEventListener("click", analyzeImage);
btnGps?.addEventListener("click", () => detectGPS().catch(() => { }));
btnSendChat?.addEventListener("click", sendChat);
chatInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendChat();
  }
});

