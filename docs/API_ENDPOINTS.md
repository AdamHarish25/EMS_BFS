# Dokumentasi API Endpoints — EMS BFS Dashboard

Dokumen ini mencatat semua alamat IP dan URL API yang digunakan oleh aplikasi **EMS BFS Central AC Monitoring Dashboard**.

> **⚠️ Penting:** Semua URL di bawah ini saat ini menggunakan IP lokal LAN (`http://`).
> Jika aplikasi di-*deploy* ke publik (misal Netlify), URL-URL ini **HARUS** diganti
> menggunakan HTTPS (misalnya via Cloudflare Tunnel) agar tidak terblokir oleh browser.

---

## 🌐 Server Node-RED (Backend API)

**Host:** `10.165.40.127`
**Port:** `1880`
**Protokol:** `HTTP` *(butuh upgrade ke HTTPS untuk production publik)*

### Daftar Endpoint

| No | Method | URL Lengkap | Fungsi | Dipakai di File |
|----|--------|-------------|--------|-----------------|
| 1 | `GET` | `http://10.165.40.127:1880/api/ems-bfs` | Ambil semua data sensor dari tabel `BFS_EMS_Sensor` | `app/page.tsx`, `app/data-management/page.tsx`, `app/reports/page.tsx` |
| 2 | `GET` | `http://10.165.40.127:1880/api/get-excluded` | Ambil semua data yang sudah dieksklusi dari tabel `BFS_EMS_Fumigasi` | `app/data-management/page.tsx`, `app/reports/page.tsx` |
| 3 | `POST` | `http://10.165.40.127:1880/api/exclude-data` | Pindahkan data dari `BFS_EMS_Sensor` ke `BFS_EMS_Fumigasi` (proses ekskusi) | `components/data/ExclusionForm.tsx` |
| 4 | `POST` | `http://10.165.40.127:1880/api/delete-exclusion` | Hapus data eksklusi dari `BFS_EMS_Fumigasi` berdasarkan `id` | `app/data-management/page.tsx` |

---

## 🗄️ Database PostgreSQL (Koneksi Langsung)

**Host:** `10.165.40.127`
**Port:** `5432`
**Penggunaan:** Koneksi langsung dari Next.js API Route (saat menggunakan `/api/exclusions` internal)
**Konfigurasi:** Di file `.env.local` dengan format:
```
DATABASE_URL=postgres://user:password@10.165.40.127:5432/dbname
```
**Dipakai di:** `app/api/exclusions/route.ts`

---

## 🖥️ Next.js App Server (Frontend)

| Environment | Host | Port | Keterangan |
|-------------|------|------|------------|
| Development (Lokal) | `localhost` | `3000` | `npm run dev` |
| Development (LAN) | `192.168.88.252` | `3000` | Akses via jaringan WiFi/LAN lokal (`npm run dev -H 0.0.0.0`) |
| Production (Netlify) | `bfs-ems.netlify.app` | `443` (HTTPS) | Deploy publik |

**Catatan LAN:** IP `192.168.88.252` dikonfigurasi di `next.config.mjs` sebagai `allowedDevOrigins`.

---

## 📋 Ringkasan Tabel Database

| Nama Tabel | Skema | Fungsi |
|------------|-------|--------|
| `BFS_EMS_Sensor` | `public` | Tabel utama data sensor real-time (Temp, RH, DP) |
| `BFS_EMS_Fumigasi` | `public` | Tabel data yang sudah dieksklusi/fumigasi |

---

## 🔄 Rencana Migrasi ke Production (Cloudflare Tunnel)

Jika sudah menggunakan Cloudflare Tunnel, ganti semua URL di atas dengan:

| Sebelum (LAN) | Sesudah (Cloudflare Tunnel) |
|---|---|
| `http://10.165.40.127:1880/api/ems-bfs` | `https://api.namadomain.com/api/ems-bfs` |
| `http://10.165.40.127:1880/api/get-excluded` | `https://api.namadomain.com/api/get-excluded` |
| `http://10.165.40.127:1880/api/exclude-data` | `https://api.namadomain.com/api/exclude-data` |
| `http://10.165.40.127:1880/api/delete-exclusion` | `https://api.namadomain.com/api/delete-exclusion` |

Dan tambahkan header Cloudflare Access di setiap `fetch`:
```javascript
headers: {
  'CF-Access-Client-Id': process.env.CF_CLIENT_ID,
  'CF-Access-Client-Secret': process.env.CF_CLIENT_SECRET,
}
```

---

*Terakhir diperbarui: 2026-05-12*
