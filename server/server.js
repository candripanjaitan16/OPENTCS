require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.json');
const MASTER_KEY = process.env.MASTER_KEY;

if(!MASTER_KEY || MASTER_KEY.length < 32){
  console.error('MASTER_KEY belum diset atau kurang dari 32 karakter. Set di file .env (lihat .env.example). Server berhenti.');
  process.exit(1);
}
const key = crypto.createHash('sha256').update(MASTER_KEY).digest(); // 32 bytes for AES-256

app.use(cors());
app.use(express.json());

// very small in-memory rate limiter per IP (good enough for early dev stage)
const hits = new Map();
app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const w = hits.get(ip) || [];
  const recent = w.filter(t => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if(recent.length > 30) return res.status(429).json({ error: 'terlalu banyak request, coba lagi sebentar' });
  next();
});

function loadDb(){
  if(!fs.existsSync(DB_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return {}; }
}
function saveDb(db){
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function encrypt(text){
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}
function decrypt(payload){
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// simple id format check so we don't store garbage
const idRe = /^[a-f0-9-]{20,50}$/i;

app.post('/api/keys', (req, res) => {
  const { deviceId, provider, model, apiKey } = req.body || {};
  if(!deviceId || !idRe.test(deviceId)) return res.status(400).json({ error: 'deviceId tidak valid' });
  if(!apiKey || typeof apiKey !== 'string') return res.status(400).json({ error: 'apiKey wajib diisi' });

  const db = loadDb();
  db[deviceId] = {
    provider: provider || 'anthropic',
    model: model || '',
    apiKeyEnc: encrypt(apiKey),
    updatedAt: new Date().toISOString()
  };
  saveDb(db);
  res.json({ ok: true });
});

app.get('/api/keys/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  if(!idRe.test(deviceId)) return res.status(400).json({ error: 'deviceId tidak valid' });
  const db = loadDb();
  const row = db[deviceId];
  if(!row) return res.status(404).json({ error: 'tidak ditemukan' });
  res.json({
    provider: row.provider,
    model: row.model,
    apiKey: decrypt(row.apiKeyEnc)
  });
});

app.delete('/api/keys/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const db = loadDb();
  delete db[deviceId];
  saveDb(db);
  res.json({ ok: true });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`OPENTCS backend jalan di port ${PORT}`));
