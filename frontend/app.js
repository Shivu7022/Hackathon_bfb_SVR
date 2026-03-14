// Config
const backendBaseUrl = "http://10.69.91.198:4000";

// DOM Elements
const getEl = (id) => document.getElementById(id);
const video = getEl("video-feed");
const canvas = getEl("canvas");
const preview = getEl("preview");
const fileInput = getEl("file-input");
const btnStartCamera = getEl("btn-start-camera");
const btnAnalyze = getEl("btn-analyze");
const btnGps = getEl("btn-gps");
const resultDiv = getEl("result");
const resultPlaceholder = getEl("result-placeholder");
const cropSelect = getEl("crop");
const latInput = getEl("lat");
const lonInput = getEl("lon");
const chatWindow = getEl("chat-window");
const chatInput = getEl("chat-input");
const btnSendChat = getEl("btn-send-chat");
const languageSelect = getEl("language");

let currentImageBase64 = localStorage.getItem("krishi_image") || null;
let currentContext = null;
let mediaStream = null;

// Initialize Page Logic
window.addEventListener("DOMContentLoaded", () => {
    // Restore crop selection
    const savedContext = localStorage.getItem("krishi_context");
    if (savedContext && cropSelect) {
        cropSelect.value = JSON.parse(savedContext).crop || "tomato";
    }

    // Restore preview if exists
    if (preview && currentImageBase64) {
        preview.src = "data:image/jpeg;base64," + currentImageBase64;
        getEl("image-preview-container").style.display = "block";
        getEl("upload-trigger").style.display = "none";
    }

    // Restore previous result if exists and on detect page
    const savedResult = localStorage.getItem("krishi_result");
    if (savedResult && resultDiv) {
        const data = JSON.parse(savedResult);
        currentContext = data;
        window.currentContext = data;
        renderResult(data);
    }
});

function saveCurrentState() {
    const ctx = {
        crop: cropSelect?.value || "tomato",
        lat: latInput?.value,
        lon: lonInput?.value
    };
    localStorage.setItem("krishi_context", JSON.stringify(ctx));
    if (currentImageBase64) {
        localStorage.setItem("krishi_image", currentImageBase64);
    }
}

async function startCamera() {
    console.log("Starting camera...");
    try {
        if (mediaStream) {
            captureFrame();
            return;
        }

        const constraints = {
            video: { facingMode: "environment" }
        };
        
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (video) {
            video.srcObject = mediaStream;
            video.style.display = "block";
            video.play();
            
            // UI Transitions
            if (getEl("image-preview-container")) getEl("image-preview-container").style.display = "none";
            if (getEl("upload-trigger")) getEl("upload-trigger").style.display = "none";
            
            // Update button text to "Capture"
            if (btnStartCamera) btnStartCamera.innerText = "📸 Capture Photo";
        }
    } catch (err) {
        console.error("Error starting camera:", err);
        alert("Unable to access camera. Please ensure you have granted permissions.");
    }
}

function captureFrame() {
    console.log("Capturing frame...");
    if (!video || !video.videoWidth) return;
    
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    currentImageBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");

    if (preview) {
        preview.src = dataUrl;
        if (getEl("image-preview-container")) getEl("image-preview-container").style.display = "block";
        if (getEl("upload-trigger")) getEl("upload-trigger").style.display = "none";
        video.style.display = "none";
        
        // Reset button text
        if (btnStartCamera) btnStartCamera.innerText = "📷 Retake Photo";
    }
    
    saveCurrentState();
    
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
    }
}

function handleFileUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = reader.result;
        currentImageBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
        if (preview) {
            preview.src = dataUrl;
            getEl("image-preview-container").style.display = "block";
            getEl("upload-trigger").style.display = "none";
        }
        saveCurrentState();
    };
    reader.readAsDataURL(file);
}

async function analyzeImage() {
    if (!currentImageBase64) {
        alert("Please upload a leaf image first.");
        return;
    }

    if (resultDiv) {
        resultPlaceholder.style.display = "none";
        resultDiv.style.display = "block";
        resultDiv.innerHTML = `<div style="text-align:center; padding:2rem;">
            <div class="loader" style="border:4px solid #f3f3f3; border-top:4px solid var(--primary); border-radius:50%; width:40px; height:40px; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
            <p style="color:var(--text-muted);">Analyzing leaf and fetching weather...</p>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>`;
    }

    try {
        const savedCtx = JSON.parse(localStorage.getItem("krishi_context") || "{}");
        const payload = {
            imageBase64: currentImageBase64,
            crop: savedCtx.crop || "tomato",
            userId: "demo-user-1"
        };

        const res = await fetch(`${backendBaseUrl}/api/predict-and-recommend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Unknown error");

        currentContext = data;
        window.currentContext = data;
        localStorage.setItem("krishi_result", JSON.stringify(data));
        renderResult(data);
    } catch (err) {
        console.error("Error analyzing image", err);
        if (resultDiv) resultDiv.innerHTML = `<p style="color:#ef4444; padding:2rem; text-align:center;">Failed to analyze. Try a clearer image.</p>`;
    }
}

function renderResult(data) {
    if (!resultDiv) return;
    const { mlResult, weather, recommendation } = data;
    
    if (resultPlaceholder) resultPlaceholder.style.display = "none";
    resultDiv.style.display = "block";

    let html = `
        <div style="padding: 1rem;">
            <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #1e293b;">
                Diagnosis: <span style="color: var(--primary);">${mlResult.label}</span>
            </h3>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Confidence Score: ${(mlResult.confidence * 100).toFixed(1)}%</p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                <div class="card" style="padding: 1rem; background: #f8fafc; border: none;">
                    <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Status</span>
                    <p style="font-weight: 700; margin-top: 0.25rem;">Affected</p>
                </div>
                <div class="card" style="padding: 1rem; background: #f8fafc; border: none;">
                    <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Severity</span>
                    <p style="font-weight: 700; margin-top: 0.25rem; color: ${mlResult.severity === 'high' ? '#ef4444' : '#d97706'};">
                        ${mlResult.severity.toUpperCase()}
                    </p>
                </div>
            </div>

            <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
                <h4 style="font-weight: 600; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span>🛡️</span> Recommended Treatment
                </h4>
                <div style="background: var(--primary-light); border: 1px solid rgba(22,163,74,0.2); padding: 1.5rem; border-radius: 12px;">
                    <p style="font-size: 1.1rem; font-weight: 700; color: #064e3b; margin-bottom: 0.5rem;">${recommendation.pesticide}</p>
                    <p style="font-size: 0.95rem; color: #064e3b; opacity: 0.8; margin-bottom: 1rem;">${recommendation.dosePerLitreMl}ml per litre of water.</p>
                    
                    <div style="display: flex; gap: 2rem; border-top: 1px solid rgba(22,163,74,0.2); padding-top: 1rem;">
                        <div>
                            <span style="display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; opacity: 0.6;">Interval</span>
                            <span style="font-weight: 700;">${recommendation.intervalDays} Days</span>
                        </div>
                        <div>
                            <span style="display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; opacity: 0.6;">Total Sprays</span>
                            <span style="font-weight: 700;">${recommendation.sprays}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-top: 2rem; display: flex; flex-direction: column; gap: 1rem;">
                <a href="assistant.html" class="btn btn-primary" style="justify-content: center;">Chat with Assistant</a>
                <div style="display: flex; gap: 1rem;">
                    <button onclick="resetDetection('camera')" class="btn btn-ghost" style="flex: 1; color: var(--text-main); border: 1px solid var(--border-color);">📷 New Camera Scan</button>
                    <button onclick="resetDetection('upload')" class="btn btn-ghost" style="flex: 1; color: var(--text-main); border: 1px solid var(--border-color);">📁 Upload New Image</button>
                </div>
            </div>
        </div>
    `;
    resultDiv.innerHTML = html;
}

function resetDetection(mode) {
    localStorage.removeItem('krishi_result');
    localStorage.removeItem('krishi_image');
    currentImageBase64 = null;
    
    if (mode === 'upload') {
        location.reload(); // Simplest way to reset the whole UI state
    } else {
        location.reload(); // We reload to ensure clean DOM, then startCamera on load if we wanted, 
        // but for now simple reload is safest for the user to pick their path.
    }
}

// Global Event Listeners
btnStartCamera?.addEventListener("click", startCamera);
getEl("btn-capture")?.addEventListener("click", captureFrame);
if (fileInput) {
    fileInput.onchange = (e) => {
        if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
        }
        handleFileUpload(e);
    };
}
btnAnalyze?.addEventListener("click", analyzeImage);
cropSelect?.addEventListener("change", saveCurrentState);

// Menu Toggle Logic
getEl("menu-toggle")?.addEventListener("click", () => {
    const nav = getEl("nav-links");
    if (nav) {
        nav.classList.toggle("show");
    }
});

// Redirect to detection if upload zone clicked (and on home)
getEl("btn-scan-start")?.addEventListener("click", () => window.location.href="detect.html");
