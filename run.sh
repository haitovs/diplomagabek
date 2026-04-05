#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# HashCracker — WiFi Security Analysis Tool
# Run script for macOS / Linux / Kali
# Opens backend and frontend in separate terminal windows
# ─────────────────────────────────────────────────────────────────────

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

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
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Install from: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

# ── Install dependencies if needed ──
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi
if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm --prefix server install
fi
echo -e "${GREEN}✓${NC} Dependencies installed"

# ── Check tools ──
if command -v hashcat &>/dev/null; then
    echo -e "${GREEN}✓${NC} hashcat found"
else
    echo -e "${YELLOW}⚠${NC} hashcat not found"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "    Install: brew install hashcat"
    else
        echo "    Install: sudo apt install hashcat"
    fi
fi

if command -v hcxpcapngtool &>/dev/null; then
    echo -e "${GREEN}✓${NC} hcxpcapngtool found"
else
    echo -e "${YELLOW}⚠${NC} hcxpcapngtool not found"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "    Install: brew install hcxtools"
    else
        echo "    Install: sudo apt install hcxtools"
    fi
fi

# ── Setup wordlist ──
WORDLIST_PATH="${WORDLIST_PATH:-/tmp/rockyou_sample.txt}"
if [ ! -f "$WORDLIST_PATH" ]; then
    echo -e "${YELLOW}Downloading sample wordlist...${NC}"
    curl -sL -o "$WORDLIST_PATH" \
        "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10k-most-common.txt" \
        2>/dev/null || true
fi
[ -f "$WORDLIST_PATH" ] && echo -e "${GREEN}✓${NC} Wordlist ready"

echo ""

# ── Build env string ──
ENV_VARS="WORDLIST_PATH='$WORDLIST_PATH' WORDLIST_ROCKYOU_SAMPLE_PATH='$WORDLIST_PATH' WORDLIST_ROCKYOU_PATH='$WORDLIST_PATH'"
BACKEND_CMD="$ENV_VARS node server/src/index.js"
FRONTEND_CMD="npx vite --host 0.0.0.0"

# ── Sudo hint ──
if [ "$EUID" -ne 0 ] 2>/dev/null; then
    echo -e "${YELLOW}Tip:${NC} Run with ${CYAN}sudo ./run.sh${NC} for WiFi capture support"
    echo ""
fi

# ── Open in separate terminal windows ──
open_terminal() {
    local title="$1"
    local cmd="$2"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript <<EOF
tell application "Terminal"
    activate
    do script "cd '$PROJECT_DIR' && clear && echo '━━━ $title ━━━' && echo '' && $cmd"
end tell
EOF
    elif command -v gnome-terminal &>/dev/null; then
        gnome-terminal --title="$title" -- bash -c "cd '$PROJECT_DIR' && echo '━━━ $title ━━━' && $cmd; exec bash" &
    elif command -v xfce4-terminal &>/dev/null; then
        xfce4-terminal --title="$title" -e "bash -c \"cd '$PROJECT_DIR' && echo '━━━ $title ━━━' && $cmd; exec bash\"" &
    elif command -v konsole &>/dev/null; then
        konsole -e bash -c "cd '$PROJECT_DIR' && echo '━━━ $title ━━━' && $cmd; exec bash" &
    elif command -v xterm &>/dev/null; then
        xterm -title "$title" -e "cd '$PROJECT_DIR' && echo '━━━ $title ━━━' && $cmd; bash" &
    elif command -v qterminal &>/dev/null; then
        qterminal -e "bash -c \"cd '$PROJECT_DIR' && $cmd; exec bash\"" &
    else
        echo -e "${YELLOW}No GUI terminal found. Starting $title in background.${NC}"
        bash -c "cd '$PROJECT_DIR' && $cmd" &
        echo "  PID: $!"
    fi
}

echo -e "${CYAN}Starting services in separate terminals...${NC}"
echo ""

# ── Start Backend ──
open_terminal "HashCracker Backend (port 8080)" "$BACKEND_CMD"
sleep 2

# ── Start Frontend ──
open_terminal "HashCracker Frontend (port 5173)" "$FRONTEND_CMD"
sleep 1

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Both services started!${NC}"
echo ""
echo -e "  Frontend: ${CYAN}http://localhost:5173${NC}"
echo -e "  Backend:  ${CYAN}http://localhost:8080${NC}"
echo ""
echo -e "  Close the terminal windows to stop."
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    sleep 2 && open "http://localhost:5173" &
elif command -v xdg-open &>/dev/null; then
    sleep 2 && xdg-open "http://localhost:5173" &
fi
