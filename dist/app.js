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
const scrollEl = document.getElementById("scroll");
const chatInner = document.getElementById("chatInner");
const emptyState = document.getElementById("emptyState");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const menuBtn = document.getElementById("menuBtn");
const rail = document.getElementById("rail");
const networkSvg = document.getElementById("networkSvg");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");
const zoomLabel = document.getElementById("zoomLabel");

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
    activateNetwork();
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
  renderNetwork(1, false);
});

/* ============================================================
   NEURAL NETWORK VISUAL — ANIMASI SAJA.
   Ini murni tampilan/visualisasi untuk kesan "AI sedang memproses".
   TIDAK ADA perhitungan neural network sungguhan (tidak ada layer
   weight, activation function, forward propagation, dsb) di sini —
   hanya SVG + CSS animation untuk efek visual.
   ============================================================ */

let networkResetTimer = null; // timeout id: jeda 2 detik sebelum collapse
let networkScale = 1;
let isProcessing = false;

const NODE_RADIUS = 5.5; // radius node kata biasa
const MANDATORY_RADIUS = 6.5; // node wajib (kiri/kanan) sedikit lebih besar
const MANDATORY_COLOR = "var(--signal)"; // pakai warna teal yang sudah ada, bukan warna acak

const NET_CENTER_X = 140; // tetap 140,70 -- HARUS sama dengan yang dipakai node-pop
const NET_CENTER_Y = 70; // di style.css (calc(140px - var(--nx)) dst), jangan diubah
// supaya animasi "tumbuh dari tengah" tetap presisi.

const STAGGER_MS = 45; // jeda animasi per "jarak kolom" ke tengah, biar terasa tumbuh dari tengah

const SVG_NS = "http://www.w3.org/2000/svg";

// Batas spacing dasar (dipertahankan dari versi sebelumnya), tapi akan
// otomatis mengecil kalau jumlah kolom/baris makin banyak, supaya seluruh
// jaringan tetap muat di dalam viewBox 280x140 yang sudah ada di HTML --
// tidak perlu mengubah index.html ataupun style.css sama sekali.
const BASE_COL_SPACING = 50;
const BASE_ROW_SPACING = 12;
const MARGIN_X = 28;
const MARGIN_Y = 18;
const MAX_PER_COLUMN = 10; // sama seperti konsep "10 titik per kolom" sebelumnya

// Titik jalan (traveling dot) per garis, pakai <animateMotion> SVG native.
// Ringan karena animasinya dijalankan oleh browser sendiri (bukan JS
// setInterval/requestAnimationFrame loop), jadi tetap smooth walau
// jumlah garis ratusan.
const DOT_RADIUS = 1.6;
const DOT_DUR_MIN = 0.75; // detik
const DOT_DUR_MAX = 1.45; // detik, divariasikan biar gak semua dot jalan serempak/kaku

function countWords(text) {
  if (!text.trim()) return 1;
  return text.trim().split(/\s+/).length;
}

// Bagi wordCount ke beberapa kolom kata. Sisa pembagian yang tidak rata
// diprioritaskan ke kolom yang PALING DEKAT KE TENGAH -- bukan ke kolom
// paling kiri/kanan -- supaya distribusi visual tetap seimbang.
function distributeWordColumns(wordCount) {
  const n = Math.max(1, wordCount);
  const numCols = Math.max(1, Math.ceil(n / MAX_PER_COLUMN));
  const base = Math.floor(n / numCols);
  let remainder = n - base * numCols;

  const counts = new Array(numCols).fill(base);
  const center = (numCols - 1) / 2;
  const order = [...Array(numCols).keys()].sort(
    (a, b) => Math.abs(a - center) - Math.abs(b - center),
  );
  for (let i = 0; i < remainder; i++) counts[order[i]]++;

  return counts;
}

// Bangun posisi semua node. Struktur kolom penuh selalu:
// [ NODE WAJIB KIRI, ...kolom kata di tengah..., NODE WAJIB KANAN ]
// Kedua node wajib TIDAK PERNAH hilang, walau wordCount sangat kecil.
// Semua kolom di-tengahkan secara vertikal & horizontal terhadap
// (NET_CENTER_X, NET_CENTER_Y) yang sama dipakai animasi node-pop di CSS.
function buildLayout(wordCount) {
  const wordCols = distributeWordColumns(wordCount);
  const allCounts = [1, ...wordCols, 1];
  const numCols = allCounts.length;
  const maxRows = Math.max(...allCounts);

  const usableWidth = 280 - MARGIN_X * 2;
  const usableHeight = 140 - MARGIN_Y * 2;
  const colSpacing =
    numCols > 1 ? Math.min(BASE_COL_SPACING, usableWidth / (numCols - 1)) : 0;
  const rowSpacing =
    maxRows > 1 ? Math.min(BASE_ROW_SPACING, usableHeight / (maxRows - 1)) : 0;

  const centerCol = (numCols - 1) / 2;

  return allCounts.map((count, colIdx) => {
    const x = NET_CENTER_X + (colIdx - centerCol) * colSpacing;
    const span = (count - 1) * rowSpacing;
    const startY = NET_CENTER_Y - span / 2;
    const nodes = [];
    for (let r = 0; r < count; r++) {
      nodes.push({
        x,
        y: startY + r * rowSpacing,
        isMandatory: colIdx === 0 || colIdx === numCols - 1,
      });
    }
    return nodes;
  });
}

function getColorForDot(idx) {
  const hue = (idx * 30) % 360;
  return `hsl(${hue}, 100%, 50%)`;
}

// Bikin satu <circle> kecil yang "jalan" sepanjang garis nodeA -> nodeB,
// pakai <animateMotion path="..."> native SVG (bukan JS loop). Fungsi ini
// HANYA dipanggil kalau animate === true (lihat renderNetwork), jadi
// elemen titiknya memang tidak pernah ada di DOM sebelum user menekan
// Enter / klik kirim -- bukan sekadar disembunyikan lewat opacity.
function createTravelDot(nodeA, nodeB, color, idx, extraDelayMs) {
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("r", DOT_RADIUS);
  dot.setAttribute("class", "network-dot active");
  dot.style.fill = color;

  const dur =
    DOT_DUR_MIN + (((idx * 37) % 100) / 100) * (DOT_DUR_MAX - DOT_DUR_MIN);
  const beginDelay = (extraDelayMs || 0) + ((idx * 53) % 400);

  const anim = document.createElementNS(SVG_NS, "animateMotion");
  anim.setAttribute("path", `M${nodeA.x},${nodeA.y} L${nodeB.x},${nodeB.y}`);
  anim.setAttribute("dur", dur.toFixed(2) + "s");
  anim.setAttribute("repeatCount", "indefinite");
  anim.setAttribute("begin", beginDelay + "ms");
  dot.appendChild(anim);

  return dot;
}

// Membangun ulang seluruh struktur node + garis.
// Struktur SELALU: node wajib kiri -> kolom-kolom kata di tengah -> node
// wajib kanan. Koneksi dibuat MESH PENUH antar kolom bertetangga (setiap
// node terhubung ke SEMUA node di kolom sebelahnya), jadi tidak ada node
// yang terisolasi.
// Node & garis muncul dengan delay dihitung dari jaraknya ke kolom TENGAH,
// jadi jaringan terasa "tumbuh dari tengah" ke kedua sisi.
// PENTING: titik jalan (<animateMotion>) HANYA dibuat kalau animate ===
// true, yaitu saat pesan benar-benar dikirim ke AI (activateNetworkProcessing).
// Saat idle atau baru mengetik (updateNetworkByInput -> animate=false),
// tidak ada satupun elemen titik yang dibuat.
function renderNetwork(wordCount, animate = false) {
  networkSvg.innerHTML = "";
  const columns = buildLayout(wordCount);
  const centerCol = (columns.length - 1) / 2;

  // Garis (+ titik jalan kalau animate) di bawah node, mesh penuh antar
  // kolom bersebelahan -- termasuk dari/ke node wajib.
  let dotGlobalIdx = 0;
  columns.forEach((column, colIdx) => {
    if (colIdx >= columns.length - 1) return;
    const nextColumn = columns[colIdx + 1];
    const delay = Math.abs(colIdx - centerCol) * STAGGER_MS;
    let lineColorIdx = colIdx * 7;
    column.forEach((nodeA) => {
      nextColumn.forEach((nodeB) => {
        const color = getColorForDot(lineColorIdx);

        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", nodeA.x);
        line.setAttribute("y1", nodeA.y);
        line.setAttribute("x2", nodeB.x);
        line.setAttribute("y2", nodeB.y);
        line.setAttribute(
          "class",
          "network-link line-enter" + (animate ? " active" : ""),
        );
        line.style.stroke = color;
        line.style.animationDelay = delay + "ms";
        networkSvg.appendChild(line);

        if (animate) {
          const dot = createTravelDot(nodeA, nodeB, color, dotGlobalIdx, delay);
          networkSvg.appendChild(dot);
          dotGlobalIdx++;
        }

        lineColorIdx++;
      });
    });
  });

  // Node di atas garis & titik jalan, biar lampu/glow-nya tetap paling
  // menonjol. Node wajib (kolom pertama & terakhir) pakai warna & radius
  // berbeda supaya selalu terlihat jelas mana yang "wajib ada".
  let globalIdx = 0;
  columns.forEach((column, colIdx) => {
    const delay = Math.abs(colIdx - centerCol) * STAGGER_MS;
    column.forEach((node) => {
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", node.x);
      circle.setAttribute("cy", node.y);
      circle.setAttribute(
        "r",
        node.isMandatory ? MANDATORY_RADIUS : NODE_RADIUS,
      );
      circle.setAttribute(
        "class",
        "network-node node-enter" + (animate ? " active" : ""),
      );
      circle.style.fill = node.isMandatory
        ? MANDATORY_COLOR
        : getColorForDot(globalIdx);
      circle.style.setProperty("--nx", node.x + "px");
      circle.style.setProperty("--ny", node.y + "px");
      circle.style.animationDelay = delay + "ms";
      networkSvg.appendChild(circle);
      globalIdx++;
    });
  });
}

function updateNetworkByInput() {
  if (isProcessing) return;
  const wordCount = countWords(msgInput.value);
  renderNetwork(wordCount, false);
}

// Dipanggil saat pesan dikirim ke AI. wordCountOverride WAJIB dihitung dari
// teks yang benar-benar dikirim (bukan dari msgInput.value setelah dikosongkan).
// Semua node & garis langsung menyala BERSAMAAN dan berdenyut pelan lewat
// CSS (.active), dan setiap garis punya titik jalannya sendiri yang looping
// otomatis lewat <animateMotion> (native SVG, bukan JS loop).
function activateNetworkProcessing(wordCountOverride) {
  if (networkResetTimer) {
    clearTimeout(networkResetTimer);
    networkResetTimer = null;
  }
  isProcessing = true;
  const wordCount = wordCountOverride || countWords(msgInput.value) || 1;
  renderNetwork(wordCount, true);
}

// Dipanggil setelah balasan AI selesai (termasuk selesai efek ketik-per-huruf).
// Jaringan TETAP menyala berdenyut selama 2 detik dulu, baru setelah itu
// mengempis kembali ke satu titik di tengah (efek akhir yang sudah ada).
function resetNetwork() {
  if (networkResetTimer) clearTimeout(networkResetTimer);

  networkResetTimer = setTimeout(() => {
    isProcessing = false;
    renderNetwork(1, false);
    networkResetTimer = null;
  }, 2000);
}

function activateNetwork() {
  renderNetwork(1, false);
}

function setStatus(kind, label) {
  statusDot.className =
    "dot" + (kind === "live" ? " live" : kind === "down" ? " down" : "");
  statusText.textContent = label;
}

function updateZoomDisplay() {
  networkSvg.style.transform = `scale(${networkScale})`;
  zoomLabel.textContent = Math.round(networkScale * 100) + "%";
}

zoomInBtn.addEventListener("click", () => {
  networkScale = Math.min(networkScale + 0.2, 3);
  updateZoomDisplay();
});

zoomOutBtn.addEventListener("click", () => {
  networkScale = Math.max(networkScale - 0.2, 0.5);
  updateZoomDisplay();
});

zoomResetBtn.addEventListener("click", () => {
  networkScale = 1;
  updateZoomDisplay();
});

/* ============================================================
   END NEURAL NETWORK VISUAL
   ============================================================ */

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
  const sentWordCount = countWords(text); // dihitung SEBELUM input dikosongkan

  state.history.push({ role: "user", content: text });
  addMessage("user", text);
  msgInput.value = "";
  msgInput.style.height = "auto";
  sendBtn.disabled = true;
  addTyping();
  activateNetworkProcessing(sentWordCount);

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
  // Balasan AI (termasuk efek ketik) sudah selesai di titik ini.
  // resetNetwork() akan menahan animasi processing 2 detik lagi sebelum collapse.
  resetNetwork();
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
  updateNetworkByInput();
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

renderNetwork(1, false);
toggleCustomRow();
restoreFromLocal();
renderStarterChips();
