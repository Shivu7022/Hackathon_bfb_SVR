/**
 * KrishiBot — Gemini-powered floating chatbot
 * Supports text input + audio recording (Web Speech API)
 */

(function () {
  const BACKEND = "http://10.69.91.198:4000";

  /* ── Detect mobile ──────────────────────────────────── */
  const isMobile = () => window.innerWidth <= 640;

  /* ── Inject styles ──────────────────────────────────── */
  const style = document.createElement("style");
  style.textContent = `
    /* Bubble */
    #kb-bubble {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      box-shadow: 0 4px 24px rgba(34,197,94,0.5);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-size: 1.6rem;
      border: none;
      transition: transform 0.2s, box-shadow 0.2s;
      animation: kb-pulse 2.5s infinite;
    }
    #kb-bubble:hover { transform: scale(1.1); box-shadow: 0 6px 32px rgba(34,197,94,0.7); }
    @keyframes kb-pulse {
      0%,100% { box-shadow: 0 4px 24px rgba(34,197,94,0.5); }
      50%      { box-shadow: 0 4px 36px rgba(34,197,94,0.9); }
    }

    /* Desktop panel */
    #kb-panel {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 360px;
      max-height: 520px;
      background: #0f172a;
      border: 1px solid rgba(148,163,184,0.2);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      z-index: 9998;
      overflow: hidden;
      transition: opacity 0.25s, transform 0.25s;
      transform-origin: bottom right;
    }
    #kb-panel.kb-hidden { opacity: 0; transform: scale(0.85); pointer-events: none; }

    /* Mobile — fullscreen overlay */
    @media (max-width: 640px) {
      #kb-panel {
        top: 0; left: 0; right: 0; bottom: 0;
        width: 100%; max-height: 100%;
        border-radius: 0;
      }
    }

    /* Header */
    #kb-header {
      background: linear-gradient(135deg, #166534, #15803d);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    #kb-header .kb-avatar {
      width: 36px; height: 36px;
      background: #22c55e;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; font-weight: 700; color: #052e16;
    }
    #kb-header .kb-title { font-weight: 700; color: #dcfce7; font-size: 1rem; }
    #kb-header .kb-sub { font-size: 0.72rem; color: #86efac; }
    #kb-close {
      margin-left: auto;
      background: none; border: none; cursor: pointer;
      font-size: 1.3rem; color: #86efac;
    }

    /* Messages */
    #kb-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scroll-behavior: smooth;
    }
    .kb-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 0.85rem;
      line-height: 1.5;
    }
    .kb-msg-bot {
      background: #1e293b;
      color: #e2e8f0;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }
    .kb-msg-user {
      background: linear-gradient(135deg, #166534, #15803d);
      color: #dcfce7;
      border-bottom-right-radius: 4px;
      align-self: flex-end;
    }
    .kb-msg-thinking {
      background: #1e293b;
      color: #64748b;
      align-self: flex-start;
      font-style: italic;
    }

    /* Input area */
    #kb-input-area {
      padding: 12px;
      border-top: 1px solid rgba(148,163,184,0.15);
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }
    #kb-text-input {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 10px 12px;
      color: #e2e8f0;
      font-size: 0.85rem;
      resize: none;
      box-sizing: border-box;
      font-family: inherit;
    }
    #kb-text-input:focus { outline: none; border-color: #22c55e; }
    .kb-btn-row {
      display: flex;
      gap: 8px;
    }
    #kb-send-btn, #kb-record-btn {
      border: none;
      border-radius: 10px;
      padding: 9px 16px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    #kb-send-btn {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: #052e16;
      flex: 1;
    }
    #kb-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #kb-record-btn {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
    }
    #kb-record-btn.recording {
      background: #7f1d1d;
      color: #fca5a5;
      border-color: #ef4444;
      animation: kb-rec-blink 1s infinite;
    }
    @keyframes kb-rec-blink {
      0%,100% { opacity: 1; } 50% { opacity: 0.6; }
    }
    #kb-record-status {
      font-size: 0.72rem;
      color: #64748b;
      text-align: center;
    }
  `;
  document.head.appendChild(style);

  /* ── Build DOM ──────────────────────────────────────── */
  // Bubble
  const bubble = document.createElement("button");
  bubble.id = "kb-bubble";
  bubble.title = "Chat with KrishiBot";
  bubble.innerHTML = "🌿";
  document.body.appendChild(bubble);

  // Panel
  const panel = document.createElement("div");
  panel.id = "kb-panel";
  panel.classList.add("kb-hidden");
  panel.innerHTML = `
    <div id="kb-header">
      <div class="kb-avatar">K</div>
      <div>
        <div class="kb-title">KrishiBot</div>
        <div class="kb-sub">Powered by Gemini AI · Farming Assistant</div>
      </div>
      <button id="kb-close" title="Close">✕</button>
    </div>
    <div id="kb-messages">
      <div class="kb-msg kb-msg-bot">
        🌾 Namaste! I'm KrishiBot. Ask me anything about your crops, diseases, or pesticides — in any language!
      </div>
    </div>
    <div id="kb-input-area">
      <textarea id="kb-text-input" rows="2" placeholder="Type your question here... (Hindi, Kannada, English, etc.)"></textarea>
      <div class="kb-btn-row">
        <button id="kb-record-btn" title="Record audio">🎤 Record</button>
        <button id="kb-send-btn">Send ➤</button>
      </div>
      <div id="kb-record-status"></div>
    </div>
  `;
  document.body.appendChild(panel);

  /* ── References ─────────────────────────────────────── */
  const messages = document.getElementById("kb-messages");
  const textInput = document.getElementById("kb-text-input");
  const sendBtn = document.getElementById("kb-send-btn");
  const recordBtn = document.getElementById("kb-record-btn");
  const recordStatus = document.getElementById("kb-record-status");
  const closeBtn = document.getElementById("kb-close");

  /* ── Toggle panel ───────────────────────────────────── */
  function openPanel() {
    panel.classList.remove("kb-hidden");
    bubble.innerHTML = "✕";
    textInput.focus();
  }
  function closePanel() {
    panel.classList.add("kb-hidden");
    bubble.innerHTML = "🌿";
  }

  bubble.addEventListener("click", () => {
    panel.classList.contains("kb-hidden") ? openPanel() : closePanel();
  });
  closeBtn.addEventListener("click", closePanel);

  /* ── Append message ─────────────────────────────────── */
  function addMsg(text, type) {
    const div = document.createElement("div");
    div.className = `kb-msg kb-msg-${type}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  /* ── Send to Gemini ─────────────────────────────────── */
  async function sendMessage(text) {
    if (!text.trim()) return;
    addMsg(text, "user");
    textInput.value = "";
    sendBtn.disabled = true;

    const thinking = addMsg("⏳ KrishiBot is thinking...", "thinking");

    // Gather context from current diagnosis if available
    const ctx = window.currentContext?.recommendation || {};
    const context = {
      diseaseLabel: ctx.diseaseLabel,
      crop: ctx.crop,
      severity: ctx.severity,
      pesticide: ctx.pesticide,
      language: document.getElementById("language")?.value || "en"
    };

    try {
      const res = await fetch(`${BACKEND}/api/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context })
      });
      const data = await res.json();
      thinking.remove();
      if (data.success) {
        addMsg(data.reply, "bot");
      } else {
        addMsg("⚠️ " + (data.error || "Error getting response."), "bot");
      }
    } catch (err) {
      thinking.remove();
      addMsg("⚠️ Could not reach KrishiBot. Make sure the backend is running and GEMINI_API_KEY is set.", "bot");
    } finally {
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener("click", () => sendMessage(textInput.value));
  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(textInput.value);
    }
  });

  /* ── Audio recording (Web Speech API) ──────────────── */
  let recognition = null;
  let isRecording = false;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = ""; // Auto-detect language (browser default)

    recognition.onstart = () => {
      isRecording = true;
      recordBtn.classList.add("recording");
      recordBtn.textContent = "🔴 Stop";
      recordStatus.textContent = "🎙️ Listening... speak now.";
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        event.results[i].isFinal ? (final += t) : (interim += t);
      }
      textInput.value = (final || interim).trim();
      if (final) {
        recordStatus.textContent = "✅ Voice captured. Press Send or keep speaking.";
      } else {
        recordStatus.textContent = "📢 " + interim;
      }
    };

    recognition.onerror = (e) => {
      recordStatus.textContent = `⚠️ Speech error: ${e.error}. Try typing instead.`;
      stopRecording();
    };

    recognition.onend = () => stopRecording();
  } else {
    recordBtn.title = "Speech recognition not supported in this browser";
    recordBtn.style.opacity = "0.4";
    recordBtn.disabled = true;
    recordStatus.textContent = "ℹ️ Audio recording not supported. Use Chrome on Android.";
  }

  function startRecording() {
    if (!recognition) return;
    recognition.start();
  }

  function stopRecording() {
    isRecording = false;
    recordBtn.classList.remove("recording");
    recordBtn.textContent = "🎤 Record";
  }

  recordBtn.addEventListener("click", () => {
    if (!recognition) return;
    if (isRecording) {
      recognition.stop();
    } else {
      recordStatus.textContent = "";
      startRecording();
    }
  });

})();
