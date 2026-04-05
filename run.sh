#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# HashCracker — WiFi Security Analysis Tool
# One-command start for macOS / Linux / Kali
# ─────────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║      HashCracker — WiFi Security Tool    ║"
echo "  ║          Diploma Project                 ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── Check Node.js ──
if ! command -v node &>/dev/null; then
    echo -e "${RED}Error: Node.js not found. Install from https://nodejs.org/${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

# ── Install deps ──
[ ! -d "node_modules" ] && echo -e "${YELLOW}Installing frontend deps...${NC}" && npm install
[ ! -d "server/node_modules" ] && echo -e "${YELLOW}Installing backend deps...${NC}" && npm --prefix server install
echo -e "${GREEN}✓${NC} Dependencies ready"

# ── Check tools ──
command -v hashcat &>/dev/null && echo -e "${GREEN}✓${NC} hashcat" || echo -e "${YELLOW}⚠ hashcat not found${NC}"
command -v hcxpcapngtool &>/dev/null && echo -e "${GREEN}✓${NC} hcxpcapngtool" || echo -e "${YELLOW}⚠ hcxpcapngtool not found${NC}"

# ── Wordlist ──
export WORDLIST_PATH="${WORDLIST_PATH:-/tmp/rockyou_sample.txt}"
if [ ! -f "$WORDLIST_PATH" ]; then
    echo -e "${YELLOW}Downloading sample wordlist...${NC}"
    curl -sL -o "$WORDLIST_PATH" \
        "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10k-most-common.txt" 2>/dev/null || true
fi
export WORDLIST_ROCKYOU_SAMPLE_PATH="$WORDLIST_PATH"
export WORDLIST_ROCKYOU_PATH="$WORDLIST_PATH"

# ── Build frontend ──
if [ ! -d "dist" ] || [ "$(find src -newer dist/index.html 2>/dev/null | head -1)" ]; then
    echo -e "${YELLOW}Building frontend...${NC}"
    npx vite build --silent 2>/dev/null || npx vite build
fi
echo -e "${GREEN}✓${NC} Frontend built"

# ── Sudo hint ──
[ "$EUID" -ne 0 ] 2>/dev/null && echo -e "${YELLOW}Tip:${NC} sudo ./run.sh for WiFi capture" && echo ""

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Open ${CYAN}http://localhost:8080${NC} in your browser"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Open browser ──
if [[ "$OSTYPE" == "darwin"* ]]; then
    (sleep 2 && open "http://localhost:8080") &
elif command -v xdg-open &>/dev/null; then
    (sleep 2 && xdg-open "http://localhost:8080") &
fi

# ── Start server (serves both API + frontend) ──
node server/src/index.js
