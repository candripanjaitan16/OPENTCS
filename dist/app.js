const providerEl = document.getElementById("provider");
const modelEl = document.getElementById("model");
const apiKeyEl = document.getElementById("apiKey");
const customUrlRow = document.getElementById("customUrlRow");
const customUrlEl = document.getElementById("customUrl");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const vpsUrlEl = document.getElementById("vpsUrl");
const backupBtn = document.getElementById("backupBtn");
const restoreBtn = document.getElementById("restoreBtn");
const backupNote = document.getElementById("backupNote");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const wavePath = document.getElementById("wavePath");
const scrollEl = document.getElementById("scroll");
const chatInner = document.getElementById("chatInner");
const emptyState = document.getElementById("emptyState");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const menuBtn = document.getElementById("menuBtn");
const rail = document.getElementById("rail");

menuBtn.addEventListener("click", () => rail.classList.toggle("open"));

const LS_KEY = "chanthecno_config_v1";

function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch {
    return {};
  }
}
function saveConfig(cfg) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}
function getDeviceId() {
  let cfg = loadConfig();
  if (!cfg.deviceId) {
    cfg.deviceId = crypto.randomUUID();
    saveConfig(cfg);
  }
  return cfg.deviceId;
}

const defaultModels = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4.1",
  google: "gemini-2.5-flash",
  custom: "",
};

const SYSTEM_PROMPT = `Kamu adalah asisten AI yang berjalan di dalam aplikasi desktop bernama chanthecno, dibuat oleh Candri — seorang siswa yang bercita-cita menjadi programmer sejak usia 15 tahun. Candri suka curhat denganmu, jadi dengarkan dengan hangat, sabar, dan tanpa menghakimi. Kalau ditanya kamu jalan di mana atau siapa pembuatmu, jawab dengan jujur bahwa kamu berjalan di aplikasi chanthecno buatan Candri.`;

let state = { connected: false, history: [] };

const starterChipsEl = document.getElementById("starterChips");

const STARTER_PROMPTS = [
  {
    label: "Cara pakai Claude",
    userText: "Gimana cara menghubungkan chanthecno ke Claude?",
    aiText:
      "Gampang. Di panel kiri, pada bagian Provider pilih **Claude (Anthropic)**. Di kolom model isi mis. `claude-sonnet-4-5`. Ambil API key dari console.anthropic.com lalu paste ke kolom API Key. Terakhir klik **Simpan lokal & hubungkan** — key kamu cuma disimpan di perangkat ini, gak pernah dikirim ke server chanthecno.",
  },
  {
    label: "Cara pakai Gemini",
    userText: "Gimana cara menghubungkan chanthecno ke Gemini?",
    aiText:
      "Pilih Provider **Gemini (Google)** di panel kiri. Isi model, mis. `gemini-2.5-flash`. Ambil API key gratis dari Google AI Studio (aistudio.google.com), paste ke kolom API Key, lalu klik **Simpan lokal & hubungkan**.",
  },
  {
    label: "Cara pakai ChatGPT",
    userText: "Gimana cara menghubungkan chanthecno ke ChatGPT?",
    aiText:
      "Pilih Provider **GPT (OpenAI)**. Isi model, mis. `gpt-4.1`. Ambil API key dari platform.openai.com/api-keys, paste ke kolom API Key, lalu klik **Simpan lokal & hubungkan**.",
  },
  {
    label: "Cara pakai Custom endpoint",
    userText: "Gimana cara pakai provider custom di chanthecno?",
    aiText:
      "Pilih Provider **Custom endpoint**. Nanti muncul kolom tambahan buat isi URL API, contoh kalau pakai Groq: `https://api.groq.com/openai/v1/chat/completions`. Isi juga model (mis. `llama-3.3-70b-versatile`) dan API key dari provider itu. Format request & balasannya mengikuti standar OpenAI-compatible, jadi kebanyakan provider gratis/murah bisa dipakai di sini.",
  },
  {
    label: "Tentang aplikasi ini",
    userText: "Aplikasi chanthecno ini apa dan siapa yang bikin?",
    aiText:
      "chanthecno adalah chat client AI desktop, dibuat oleh **Candri**. Fitur yang sudah ada: bawa API key sendiri (BYOK) buat Claude, Gemini, ChatGPT, atau endpoint custom apa pun; key disimpan lokal di perangkatmu; opsi backup key terenkripsi ke VPS pribadi; dan tampilan chat dengan efek mengetik.",
  },
];

function renderStarterChips() {
  if (!starterChipsEl) return;
  starterChipsEl.innerHTML = "";
  STARTER_PROMPTS.forEach((p) => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.type = "button";
    btn.textContent = p.label;
    btn.addEventListener("click", () => runStarterPrompt(p));
    starterChipsEl.appendChild(btn);
  });
}

async function runStarterPrompt(p) {
  state.history.push({ role: "user", content: p.userText });
  addMessage("user", p.userText);
  addTyping();
  await new Promise((r) => setTimeout(r, 350));
  removeTyping();
  state.history.push({ role: "assistant", content: p.aiText });
  await addMessage("ai", p.aiText);
}

function restoreFromLocal() {
  const cfg = loadConfig();
  if (cfg.provider) providerEl.value = cfg.provider;
  if (cfg.model) modelEl.value = cfg.model;
  if (cfg.apiKey) apiKeyEl.value = cfg.apiKey;
  if (cfg.customUrl) customUrlEl.value = cfg.customUrl;
  if (cfg.vpsUrl) vpsUrlEl.value = cfg.vpsUrl;
  toggleCustomRow();
  if (cfg.apiKey) {
    state.connected = true;
    setStatus("live", `terhubung · ${providerEl.value}`);
    sendBtn.disabled = false;
    pulseWave();
  }
}

function toggleCustomRow() {
  customUrlRow.style.display = providerEl.value === "custom" ? "block" : "none";
}
providerEl.addEventListener("change", () => {
  toggleCustomRow();
  if (!modelEl.value)
    modelEl.placeholder = defaultModels[providerEl.value] || "model";
});

saveKeyBtn.addEventListener("click", () => {
  const provider = providerEl.value;
  const key = apiKeyEl.value.trim();
  if (!key) {
    setStatus("down", "isi API key dulu");
    return;
  }
  const cfg = loadConfig();
  cfg.provider = provider;
  cfg.model = modelEl.value.trim() || defaultModels[provider];
  cfg.apiKey = key;
  cfg.customUrl = customUrlEl.value.trim();
  cfg.vpsUrl = vpsUrlEl.value.trim();
  saveConfig(cfg);
  state.connected = true;
  setStatus("live", `tersambung · ${provider}`);
  sendBtn.disabled = false;
  pulseWave();
});

let waveTimer = null;
function flatWave() {
  wavePath.classList.remove("active");
  wavePath.setAttribute("d", "M0,18 L260,18");
}
function pulseWave() {
  wavePath.classList.add("active");
  let t = 0;
  clearInterval(waveTimer);
  waveTimer = setInterval(() => {
    t += 1;
    let d = "M0,18 ";
    for (let x = 0; x <= 260; x += 8) {
      const y = 18 + Math.sin(x * 0.15 + t * 0.5) * 8;
      d += `L${x},${y.toFixed(1)} `;
    }
    wavePath.setAttribute("d", d);
  }, 60);
}
function setStatus(kind, label) {
  statusDot.className =
    "dot" + (kind === "live" ? " live" : kind === "down" ? " down" : "");
  statusText.textContent = label;
}

function scrollToBottom() {
  scrollEl.scrollTop = scrollEl.scrollHeight;
}

function renderMarkdown(text) {
  let safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  safe = safe.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  safe = safe.replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/g, "$1<i>$2</i>");
  safe = safe.replace(/`(.+?)`/g, "<code>$1</code>");
  safe = safe.replace(/\n/g, "<br>");

  return safe;
}

function typeMessage(bubble, text, speed = 20) {
  let i = 0;
  const chunkSize = 1;
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      i += chunkSize;
      bubble.textContent = text.slice(0, i);
      scrollToBottom();
      if (i >= text.length) {
        clearInterval(timer);
        bubble.innerHTML = renderMarkdown(text);
        resolve();
      }
    }, speed);
  });
}

function addMessage(role, text) {
  emptyState.style.display = "none";
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "ai");
  wrap.innerHTML =
    role === "ai"
      ? `<div class="avatar"></div><div class="bubble"></div>`
      : `<div class="bubble"></div>`;
  const bubble = wrap.querySelector(".bubble");
  chatInner.appendChild(wrap);
  if (role === "ai") {
    return typeMessage(bubble, text);
  } else {
    bubble.textContent = text;
    scrollToBottom();
  }
}
function addTyping() {
  const wrap = document.createElement("div");
  wrap.className = "msg ai";
  wrap.id = "typingRow";
  wrap.innerHTML = `<div class="avatar"></div><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
  chatInner.appendChild(wrap);
  scrollToBottom();
}
function removeTyping() {
  document.getElementById("typingRow")?.remove();
}
function addError(text) {
  const el = document.createElement("div");
  el.className = "error-note";
  el.textContent = text;
  chatInner.appendChild(el);
  scrollToBottom();
}

function buildRequest(provider, cfg, history) {
  const model = cfg.model || defaultModels[provider];
  if (provider === "anthropic") {
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: {
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: history,
      },
    };
  }
  if (provider === "openai") {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer " + cfg.apiKey,
      },
      body: {
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      },
    };
  }
  if (provider === "google") {
    const contents = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cfg.apiKey}`,
      headers: { "content-type": "application/json" },
      body: {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
      },
    };
  }
  return {
    url: cfg.customUrl,
    headers: {
      "content-type": "application/json",
      Authorization: "Bearer " + cfg.apiKey,
    },
    body: {
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
    },
  };
}

function extractReply(provider, data) {
  if (provider === "anthropic") {
    const t = data?.content?.find((c) => c.type === "text");
    if (t) return t.text;
  }
  if (provider === "openai" || provider === "custom") {
    if (data?.choices?.[0]?.message?.content)
      return data.choices[0].message.content;
  }
  if (provider === "google") {
    const t = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .join("");
    if (t) return t;
  }
  if (typeof data?.reply === "string") return data.reply;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.text === "string") return data.text;
  if (data?.error) return null;
  return JSON.stringify(data);
}

async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !state.connected) return;
  const cfg = loadConfig();
  const provider = cfg.provider;

  state.history.push({ role: "user", content: text });
  addMessage("user", text);
  msgInput.value = "";
  msgInput.style.height = "auto";
  sendBtn.disabled = true;
  addTyping();

  try {
    const { url, headers, body } = buildRequest(provider, cfg, state.history);
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    removeTyping();
    if (!res.ok) {
      addError(
        `API error (${res.status}): ${data?.error?.message || JSON.stringify(data)}`,
      );
    } else {
      const reply = extractReply(provider, data);
      if (reply == null) {
        addError(
          "Provider mengembalikan error: " +
            JSON.stringify(data?.error || data),
        );
      } else {
        state.history.push({ role: "assistant", content: reply });
        await addMessage("ai", reply);
      }
    }
  } catch (e) {
    removeTyping();
    addError("Gagal menghubungi provider: " + e.message);
  }
  sendBtn.disabled = false;
  msgInput.focus();
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
msgInput.addEventListener("input", () => {
  msgInput.style.height = "auto";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 160) + "px";
});

backupBtn.addEventListener("click", async () => {
  const cfg = loadConfig();
  const vps = vpsUrlEl.value.trim();
  if (!vps || !cfg.apiKey) {
    backupNote.textContent = "isi VPS URL & API key dulu";
    return;
  }
  cfg.vpsUrl = vps;
  saveConfig(cfg);
  const deviceId = getDeviceId();
  backupNote.textContent = "menyimpan...";
  try {
    const res = await fetch(vps.replace(/\/$/, "") + "/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deviceId,
        provider: cfg.provider,
        model: cfg.model,
        apiKey: cfg.apiKey,
      }),
    });
    if (!res.ok) throw new Error("status " + res.status);
    backupNote.textContent =
      "tersimpan ✓ (device id: " + deviceId.slice(0, 8) + "…)";
  } catch (e) {
    backupNote.textContent = "gagal: " + e.message;
  }
});

restoreBtn.addEventListener("click", async () => {
  const vps = vpsUrlEl.value.trim();
  if (!vps) {
    backupNote.textContent = "isi VPS URL dulu";
    return;
  }
  const deviceId = getDeviceId();
  backupNote.textContent = "memulihkan...";
  try {
    const res = await fetch(vps.replace(/\/$/, "") + "/api/keys/" + deviceId);
    if (!res.ok) throw new Error("status " + res.status);
    const data = await res.json();
    providerEl.value = data.provider || "anthropic";
    modelEl.value = data.model || "";
    apiKeyEl.value = data.apiKey || "";
    toggleCustomRow();
    saveKeyBtn.click();
    backupNote.textContent = "dipulihkan ✓";
  } catch (e) {
    backupNote.textContent = "gagal: " + e.message;
  }
});

flatWave();
toggleCustomRow();
restoreFromLocal();
renderStarterChips();
