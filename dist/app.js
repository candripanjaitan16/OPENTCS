// ---------- Elements ----------
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

// ---------- Local persistence ----------
// This is a real desktop app (Tauri), not a hosted artifact — localStorage
// is the right tool here, it's the user's own machine.
const LS_KEY = "opentcs_config_v1";

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

// ---------- Identity / system prompt ----------
// Disisipkan otomatis ke tiap request supaya AI tahu konteks aplikasi
// tempat ia berjalan. Bebas diedit teksnya sesuai kebutuhan.
const SYSTEM_PROMPT = `Kamu adalah asisten AI yang berjalan di dalam aplikasi desktop bernama OPENTCS, dibuat<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OPENTCS</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body>

<div class="menu-btn" id="menuBtn">☰</div>

<aside class="rail" id="rail">
  <div class="brand">
    <div class="brand-mark">O</div>
    <div>
      <div class="brand-word">OPENTCS</div>
      <div class="brand-sub">bawa API key-mu sendiri</div>
    </div>
  </div>

  <div class="panel-label">Provider</div>
  <div class="field-row">
    <select class="field" id="provider">
      <option value="anthropic">Claude (Anthropic)</option>
      <option value="google">Gemini (Google)</option>
      <option value="openai">GPT (OpenAI)</option>
      <option value="custom">Custom endpoint</option>
    </select>
  </div>

  <div class="field-row">
    <input class="field" id="model" placeholder="model, mis: claude-sonnet-4-5">
  </div>

  <div class="panel-label">API Key</div>
  <div class="field-row">
    <input class="field" id="apiKey" type="password" placeholder="Paste API key kamu di sini">
  </div>
  <div class="field-row" id="customUrlRow" style="display:none;">
    <input class="field" id="customUrl" placeholder="https://endpoint-kamu.com/...">
  </div>

  <button class="btn btn-primary" id="saveKeyBtn">Simpan lokal &amp; hubungkan</button>

  <div class="panel-label">Backup (opsional)</div>
  <div class="field-row">
    <input class="field" id="vpsUrl" placeholder="https://vps-kamu.com (kosongkan jika tidak pakai)">
  </div>
  <button class="btn btn-ghost" id="backupBtn">Cadangkan key terenkripsi ke server</button>
  <button class="btn btn-ghost" id="restoreBtn">Pulihkan dari server</button>
  <div class="note" id="backupNote"></div>

  <div class="signal-box">
    <div class="signal-status">
      <span class="dot" id="statusDot"></span>
      <span id="statusText">key belum diatur</span>
    </div>
    <svg id="wave" viewBox="0 0 260 36" preserveAspectRatio="none">
      <path class="wave-path" id="wavePath" d="M0,18 L260,18"/>
    </svg>
  </div>

  <div class="rail-footer">
    API key kamu disimpan <b>di perangkat ini saja</b> secara default, dan
    request dikirim langsung dari sini ke provider. Server OPENTCS (kalau ada)
    tidak pernah melihat isi obrolanmu.
  </div>
</aside>

<main class="chat-col">
  <div class="chat-scroll" id="scroll">
    <div class="chat-inner" id="chatInner">
      <div class="empty-state" id="emptyState">
        <div class="empty-title">Halo, ini OPENTCS 👋</div>
        <div class="empty-sub">Pilih provider &amp; paste API key kamu di panel kiri, lalu mulai ngobrol. Semua berjalan lokal di perangkatmu.</div>
      </div>
    </div>
  </div>

  <div class="input-bar">
    <div class="input-inner">
      <textarea id="msgInput" rows="1" placeholder="Tulis pesan..."></textarea>
      <button class="send-btn" id="sendBtn" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M4 20L20 12L4 4V10L14 12L4 14V20Z" fill="currentColor"/>
        </svg>
      </button>
    </div>
    <div class="hint">Enter untuk kirim · Shift+Enter untuk baris baru</div>
  </div>
</main>

<script src="app.js"></script>
</body>
</html>
 oleh Candri — seorang siswa yang bercita-cita menjadi programmer sejak usia 15 tahun. Candri suka curhat denganmu, jadi dengarkan dengan hangat, sabar, dan tanpa menghakimi. Kalau ditanya kamu jalan di mana atau siapa pembuatmu, jawab dengan jujur bahwa kamu berjalan di OPENTCS buatan Candri.`;

let state = { connected: false, history: [] };

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

// ---------- Signal waveform ----------
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

// ---------- Chat rendering ----------
function scrollToBottom() {
  scrollEl.scrollTop = scrollEl.scrollHeight;
}

function addMessage(role, text) {
  emptyState.style.display = "none";
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "ai");
  wrap.innerHTML =
    role === "ai"
      ? `<div class="avatar"></div><div class="bubble"></div>`
      : `<div class="bubble"></div>`;
  wrap.querySelector(".bubble").textContent = text;
  chatInner.appendChild(wrap);
  scrollToBottom();
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

// ---------- Provider request builders ----------
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
      // Anthropic pakai field 'system' terpisah, bukan role di messages
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
      // OpenAI-style: system prompt dikirim sebagai pesan pertama role 'system'
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
      // Gemini pakai field systemInstruction terpisah
      body: {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
      },
    };
  }
  // custom (mis. Groq, atau endpoint OpenAI-compatible lain)
  // FIX: sebelumnya 'model' tidak disertakan di body -> error 400
  // "property 'model' is missing" dari Groq/OpenAI-compatible API.
  // System prompt dikirim sama seperti OpenAI: pesan pertama role 'system'.
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
  // FIX: 'custom' digabung ke sini karena provider OpenAI-compatible
  // (Groq, dst.) membalas dengan struktur choices[0].message.content
  // yang sama persis dengan OpenAI. Sebelumnya 'custom' tidak dicek
  // di sini sama sekali, jadi jawabannya jatuh ke fallback JSON.stringify.
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

// ---------- Send flow ----------
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
        addMessage("ai", reply);
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

// ---------- Optional VPS backup/restore (encrypted at rest server-side) ----------
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

// ---------- Init ----------
flatWave();
toggleCustomRow();
restoreFromLocal();
