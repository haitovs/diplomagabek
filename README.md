# WiFi Password Cracking Simulation with Hashcat

A comprehensive educational React application simulating WiFi WPA/WPA2 password cracking using hashcat concepts. This is a diploma project demonstrating the mechanics of WiFi security testing.

![HashCracker Demo](https://via.placeholder.com/800x400/0a0a0f/00ff88?text=HashCracker+Dashboard)

## ✨ Features

- **500+ Mock WiFi Hashes** - Realistic hc22000 format WPA/WPA2 hashes
- **Multiple Attack Modes** - Dictionary, Brute-force, and Hybrid attacks
- **Real-time Dashboard** - Live progress, statistics, and activity logs
- **Hash Database** - Search, filter, sort, and manage hashes
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
   - **Dictionary**: Choose wordlist (common, rockyou, etc.)
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

This is a **SIMULATION** for educational purposes only. It does not:
- Interact with real WiFi networks
- Execute actual hashcat commands
- Capture real network traffic

All hashes and passwords are mock data generated for demonstration.

## 🛠️ Tech Stack

- **React 18** - UI Framework
- **Vite** - Build tool
- **Recharts** - Progress charts
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **LocalStorage** - Data persistence

## 👤 Author

Agabel - Diploma Project 2025
