# WiFi Password Cracking Simulation with Hashcat

A comprehensive educational React application simulating WiFi WPA/WPA2 password cracking using hashcat concepts. This is a diploma project demonstrating the mechanics of WiFi security testing.

![HashCracker Demo](https://via.placeholder.com/800x400/0a0a0f/00ff88?text=HashCracker+Dashboard)

## ✨ Features

- **100 Mock WiFi Hashes** - Realistic hc22000 format WPA/WPA2 hashes (50 pre-cracked demo baseline)
- **Multiple Attack Modes** - Dictionary, Brute-force, and Hybrid attacks
- **Real-time Dashboard** - Live progress, statistics, and activity logs
- **Hash Database** - Search, filter, sort, and manage hashes
- **Hash Status Dashboard** - Clear pending/cracking/cracked/failed visibility with filters
- **Localization (i18n)** - English + Turkmen language support
- **Optional Real Hashcat Backend** - Dictionary attacks via backend API + hashcat
- **Password Export** - CSV, JSON, and Potfile formats
- **Educational Content** - Learn about hashcat, masks, and attack strategies

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open in browser
# http://localhost:5173
```

### Full stack (frontend + backend API)
```bash
# Terminal 1 (frontend)
npm run dev

# Terminal 2 (backend API)
npm run server:dev

# Optional: enable real backend mode in frontend
export VITE_HASHCAT_BACKEND_URL=http://localhost:8080
# or when frontend is reverse-proxied with /api:
export VITE_HASHCAT_BACKEND_URL=/api
```

Or run both in one command:
```bash
npm run dev:full
```

Or use the run script:
```bash
run.bat
```

## 📁 Project Structure

```
agabel-crack-with-hashcat/
├── src/
│   ├── components/
│   │   ├── common/          # Header, Sidebar
│   │   ├── dashboard/       # StatsCards, ProgressChart, ActivityLog
│   │   ├── database/        # HashTable
│   │   ├── attack/          # AttackPanel
│   │   ├── results/         # CrackedList
│   │   └── about/           # AboutHashcat
│   ├── context/             # CrackingContext (global state)
│   ├── services/
│   │   ├── database/        # hashDB, mockGenerator
│   │   └── hashcat/         # simulator engine
│   ├── App.jsx
│   └── index.css
├── package.json
└── README.md
```

## 🎮 How to Use

1. **Dashboard** - View overall statistics and live cracking progress
2. **Hash Database** - Browse 500+ mock WiFi network hashes
3. **Attack Panel** - Select target hash and configure attack:
   - **Dictionary**: Choose wordlist from preset dropdown (rockyou, top100k, probable-v2, etc.)
   - **Brute-force**: Configure mask pattern (?d?d?d?d...)
   - **Hybrid**: Combine wordlist with mask
4. **Cracked Passwords** - View and export recovered passwords
5. **About** - Learn hashcat concepts and hash formats

## 🔐 Hash Modes

| Mode | Name | Description |
|------|------|-------------|
| 22000 | WPA-PBKDF2-PMKID+EAPOL | Modern WPA/WPA2 |
| 2500 | WPA-EAPOL-PBKDF2 | Legacy format |
| 16800 | WPA-PMKID-PBKDF2 | PMKID only |

## 🎭 Mask Characters

| Mask | Character Set | Count |
|------|---------------|-------|
| ?l | Lowercase (a-z) | 26 |
| ?u | Uppercase (A-Z) | 26 |
| ?d | Digits (0-9) | 10 |
| ?s | Special chars | 32 |
| ?a | All printable | 95 |

## ⚠️ Disclaimer

This project defaults to **SIMULATION** mode for educational purposes.
It can optionally connect to a real backend hashcat API for authorized password recovery testing.

Do not run attacks against systems without explicit permission.

## 🌐 Localization (i18n)

- Locale files live in `src/i18n/locales/`:
  - `en.json`
  - `tk.json`
- Runtime i18n provider: `src/context/I18nContext.jsx`
- Language switcher is in the top header.

## 🧪 New Security Instruments

The app includes a dedicated **Security Tools** page:
1. Hash Type Identifier
2. Password Strength Analyzer
3. Custom Mask Builder

Backend endpoints for these tools:
- `POST /api/tools/hash-type`
- `POST /api/tools/password-strength`
- `POST /api/tools/mask-builder`

## 🐳 Production Deployment (Server-side Wordlist Download)

Production compose file:
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

What happens:
1. `hashcat-api` container starts with `server/Dockerfile`
2. `deploy/bootstrap-wordlist.sh` runs as entrypoint
3. If `AUTO_DOWNLOAD_WORDLIST=true`, wordlist is downloaded on the server (not on local dev machine)
4. App uses `/api` proxy to reach backend hashcat service

Recommended env:
- `AUTO_DOWNLOAD_WORDLIST=true`
- `WORDLIST_URL=<trusted source>`
- `WORDLIST_SHA256=<expected checksum>`
- `WORDLIST_PATH=/opt/wordlists/rockyou.txt`
- `HASHCAT_CPU_LIMIT_PERCENT=30`
- `HASHCAT_WORKLOAD_PROFILE=1`
- `HASHCAT_USE_CPULIMIT=true`

Resource cap behavior:
- `hashcat-api` container is capped to `cpus: "0.30"` in `docker-compose.prod.yml`
- backend wraps hashcat via `cpulimit -l 30` by default
- keep both enabled to ensure cracking never exceeds ~30% CPU allocation

Troubleshooting common 404 errors:
- `vite.svg` 404: ensure `public/vite.svg` exists
- `jobs` 404: verify API base is correct
  - valid values: `VITE_HASHCAT_BACKEND_URL=/api` or `http://localhost:8080`
  - avoid doubled `/api/api/...` routing
  - in dev, run backend (`npm run server:dev`) and frontend proxy handles `/api`

If real backend mode is disabled, all cracking remains simulated.

## 🛠️ Tech Stack

- **React 18** - UI Framework
- **Vite** - Build tool
- **Recharts** - Progress charts
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **LocalStorage** - Data persistence

## 👤 Author

Agabel - Diploma Project 2025
