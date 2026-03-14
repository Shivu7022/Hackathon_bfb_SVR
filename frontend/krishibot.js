/**
 * KrishiBot / CropGuard AI Assistant — Gemini-powered diagnostic chat with Voice support
 */

(function () {
  const BACKEND = "http://10.69.91.198:4000";
  const isAssistantPage = window.location.pathname.includes("assistant.html");

  const langMap = {
    'en': 'en-IN',
    'hi': 'hi-IN',
    'kn': 'kn-IN',
    'ta': 'ta-IN',
    'te': 'te-IN',
    'mr': 'mr-IN',
    'pa': 'pa-IN'
  };

  /* ── Inject styles (only for the bubble) ──────────────── */
  if (!isAssistantPage) {
    const style = document.createElement("style");
    style.textContent = `
    #kb-bubble {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--primary, #16a34a);
      box-shadow: 0 4px 20px rgba(22,163,74,0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-size: 1.6rem;
      border: none;
      transition: transform 0.2s;
    }
    #kb-bubble:hover { transform: scale(1.1); }
    `;
    document.head.appendChild(style);

    const bubble = document.createElement("button");
    bubble.id = "kb-bubble";
    bubble.title = "Open AI Assistant";
    bubble.innerHTML = "🌿";
    bubble.onclick = () => window.location.href = "assistant.html";
    document.body.appendChild(bubble);
  }

  /* ── Assistant Logic ────────────────────────────────── */
  const chatWindow = document.getElementById("chat-window");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("btn-send-chat");
  const micBtn = document.getElementById("btn-mic");
  const langSelect = document.getElementById("language");
  const recordStatus = document.getElementById("recording-status");

  if (!chatWindow || !chatInput || !sendBtn) return;

  let recognition = null;
  let isRecording = false;

  // Persistence
  if (langSelect) {
    langSelect.value = localStorage.getItem("krishi_lang") || "en";
    langSelect.addEventListener("change", (e) => {
        localStorage.setItem("krishi_lang", e.target.value);
    });
  }

  function appendMsg(text, type) {
    const div = document.createElement("div");
    div.className = `message message-${type === 'user' ? 'user' : 'bot'}`;
    
    if (type === 'bot') {
       div.innerHTML = `
        <div style="display: flex; gap: 1rem; align-items: flex-start;">
            <div style="background: var(--primary-light); color: var(--primary); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">🤖</div>
            <div><p>${text}</p></div>
        </div>`;
    } else {
        div.textContent = text;
    }
    
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function speakResponse(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop current speech
    const utter = new SpeechSynthesisUtterance(text);
    const lang = langSelect ? langSelect.value : (localStorage.getItem("krishi_lang") || "en");
    utter.lang = langMap[lang] || 'en-IN';
    window.speechSynthesis.speak(utter);
  }

  async function sendMessage(text) {
    if (!text.trim()) return;
    appendMsg(text, "user");
    chatInput.value = "";
    sendBtn.disabled = true;

    try {
      const savedResult = localStorage.getItem("krishi_result");
      const ctx = savedResult ? JSON.parse(savedResult) : {};
      const currentLang = langSelect ? langSelect.value : (localStorage.getItem("krishi_lang") || "en");
      
      const res = await fetch(`${BACKEND}/api/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            message: text,
            context: {
                diseaseLabel: ctx.mlResult?.label,
                crop: ctx.mlResult?.crop,
                severity: ctx.mlResult?.severity,
                pesticide: ctx.recommendation?.pesticide,
                language: currentLang
            }
        })
      });
      const data = await res.json();
      if (data.success) {
        appendMsg(data.reply, "bot");
        speakResponse(data.reply);
      } else {
        appendMsg("⚠️ " + (data.error || "Error."), "bot");
      }
    } catch (err) {
      appendMsg("⚠️ Connection error. Check backend.", "bot");
    } finally {
      sendBtn.disabled = false;
    }
  }

  function startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = langMap[langSelect ? langSelect.value : "en"] || 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isRecording = true;
      if (micBtn) micBtn.style.color = "#ef4444";
      if (recordStatus) recordStatus.style.display = "block";
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      chatInput.value = transcript;
      sendMessage(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech Rec Error", event.error);
      stopRecording();
    };

    recognition.onend = () => {
      stopRecording();
    };

    recognition.start();
  }

  function stopRecording() {
    isRecording = false;
    if (micBtn) micBtn.style.color = "var(--text-muted)";
    if (recordStatus) recordStatus.style.display = "none";
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
  }

  sendBtn.addEventListener("click", () => sendMessage(chatInput.value));
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage(chatInput.value);
  });

  micBtn?.addEventListener("click", () => {
    if (isRecording) stopRecording();
    else startRecording();
  });

})();
