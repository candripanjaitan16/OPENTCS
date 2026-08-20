# OPENTCS (CSAI)

Aplikasi desktop chat AI open-source. User **bawa API key sendiri** (Claude,
Gemini, GPT, atau endpoint OpenAI-compatible seperti Groq) — request dikirim
langsung dari perangkat mereka ke provider, tanpa perantara. Tidak ada sistem
akun/login.

```
OPENTCS/
├── dist/              # Frontend (HTML/CSS/JS) — inilah yang tampil di jendela app
├── src-tauri/          # Shell desktop (Rust + Tauri)
├── server/              # Backend VPS OPSIONAL — backup API key terenkripsi
└── .github/workflows/   # Build otomatis installer Windows & Linux
```

## Kenapa arsitekturnya begini

- **Default: 100% lokal.** API key disimpan di `localStorage` milik app di
  komputer user, dan panggilan ke provider (Claude/Gemini/OpenAI/Groq/dll)
  langsung dari app ke provider. Server kamu tidak pernah menyentuh isi
  obrolan.
- **Backup ke VPS itu opsional**, dipicu manual lewat tombol "Cadangkan".
  User diidentifikasi lewat `deviceId` acak (UUID) yang dibuat otomatis saat
  pertama kali pakai app — bukan akun/password. Simpel, tapi tetap personal
  per-instalasi.
- API key yang di-backup **dienkripsi (AES-256-GCM)** di server sebelum
  ditulis ke disk, pakai `MASTER_KEY` yang hanya kamu pegang.

⚠️ **Tanggung jawab keamanan**: begitu ada satu user pakai fitur backup, kamu
jadi memegang API key asli mereka (walau terenkripsi saat disimpan). Jaga
`MASTER_KEY` di luar repo, pakai HTTPS di VPS (lihat bagian Nginx di bawah),
dan pertimbangkan fitur "hapus data saya" untuk user yang mau berhenti pakai
backup.

## Provider yang didukung

Selain Claude (Anthropic), OpenAI, dan Google Gemini secara native, app ini
juga bisa disambungkan ke **endpoint custom** apa pun yang OpenAI-compatible
— termasuk [Groq](https://console.groq.com/keys) (gratis & cepat untuk
eksperimen). Untuk provider custom, isi:

| Field | Isi |
|---|---|
| Endpoint | `https://api.groq.com/openai/v1/chat/completions` |
| API Key | key dari console provider terkait |
| Model | cek daftar model aktif via `GET /v1/models` di provider tersebut |

## Menjalankan mode development

### Prasyarat
- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs)
- Tauri CLI: `cargo install tauri-cli`
- Linux (Debian/Ubuntu/Mint): paket dev GTK & WebKit —
  ```bash
  sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
    libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
    libgtk-3-dev pkg-config
  ```
  (lihat juga [prasyarat resmi Tauri](https://tauri.app/start/prerequisites/))

### Jalankan app desktop
```bash
cargo tauri dev
```
Ini buka jendela app langsung dari folder `dist/` — gak perlu bundler
tambahan karena frontend-nya vanilla HTML/CSS/JS.

### Jalankan backend (opsional, kalau mau test fitur backup)
```bash
cd server
cp .env.example .env      # lalu isi MASTER_KEY dengan: openssl rand -hex 32
npm install
npm run dev
```
Server jalan di `http://localhost:3000`. Isi URL itu di kolom "Backup" pada
app buat nyoba — **bukan** untuk dibuka langsung di browser, karena ini API
polos tanpa halaman UI.

## Build installer (Windows .msi/.exe, Linux .deb/.AppImage)

Paling gampang lewat **GitHub Actions** (sudah disiapkan di
`.github/workflows/build.yml`) — kamu gak perlu install toolchain Windows
di Linux:

1. Push project ini ke GitHub
2. Buat tag versi: `git tag v0.1.0 && git push origin v0.1.0`
3. Actions otomatis build untuk Linux & Windows, lalu bikin **Draft
   Release** berisi installer-nya
4. Review draft-nya di tab "Releases", lalu publish

Build manual (kalau mau coba di komputer sendiri dulu):
```bash
cargo tauri build
```
Hasilnya ada di `src-tauri/target/release/bundle/`.

## Deploy backend ke VPS

1. `git clone` repo ini di VPS, masuk ke folder `server/`
2. `cp .env.example .env`, isi `MASTER_KEY` acak & rahasia
3. `npm install --production`
4. Jalankan dengan process manager: `npm install -g pm2 && pm2 start server.js --name csai`
5. Pasang reverse proxy + SSL gratis (Nginx + Certbot) supaya diakses via
   `https://` — API key **jangan pernah** dikirim lewat HTTP biasa
6. `data.json` di folder `server/` adalah "database" sederhana — cukup
   untuk tahap dev; kalau user makin banyak, ganti ke SQLite/Postgres

## Roadmap yang masuk akal

- [ ] Riwayat chat tersimpan lokal antar sesi (sudah otomatis via `localStorage`, tinggal ditambah UI daftar percakapan)
- [ ] Export/import riwayat chat sebagai file
- [ ] Auto-update lewat Tauri updater
- [ ] Ganti `data.json` di backend ke SQLite kalau user mulai banyak
- [ ] UI untuk atur system prompt/persona AI tanpa edit kode

---

Dibuat oleh **Candri**.