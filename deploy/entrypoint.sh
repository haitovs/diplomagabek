#!/usr/bin/env bash
set -euo pipefail

# ── Download wordlist if configured ──────────────────────
/usr/local/bin/bootstrap-wordlist.sh true

# ── Generate subset wordlists from rockyou.txt ───────────
WORDLIST_DIR="${WORDLIST_DIR:-/opt/wordlists}"
ROCKYOU="${WORDLIST_DIR}/rockyou.txt"

if [ -f "$ROCKYOU" ]; then
  echo "[entrypoint] Generating subset wordlists..."

  [ ! -f "${WORDLIST_DIR}/rockyou_sample.txt" ] && \
    head -n 10000 "$ROCKYOU" > "${WORDLIST_DIR}/rockyou_sample.txt" && \
    echo "  -> rockyou_sample.txt (10K)"

  [ ! -f "${WORDLIST_DIR}/top-100k.txt" ] && \
    head -n 100000 "$ROCKYOU" > "${WORDLIST_DIR}/top-100k.txt" && \
    echo "  -> top-100k.txt (100K)"

  [ ! -f "${WORDLIST_DIR}/probable-v2-top1575.txt" ] && \
    head -n 1575000 "$ROCKYOU" > "${WORDLIST_DIR}/probable-v2-top1575.txt" && \
    echo "  -> probable-v2-top1575.txt (1.57M)"

  [ ! -f "${WORDLIST_DIR}/wifi-defaults.txt" ] && \
    grep -E '^.{8,12}$' "$ROCKYOU" | head -n 5000 > "${WORDLIST_DIR}/wifi-defaults.txt" && \
    echo "  -> wifi-defaults.txt (5K)"

  echo "[entrypoint] Wordlists ready."
fi

# ── Start nginx in the background ────────────────────────
echo "[entrypoint] Starting nginx on :4090"
nginx

# ── Start hashcat API server in the foreground ───────────
echo "[entrypoint] Starting hashcat API on :${PORT:-8080}"
exec node /srv/app/src/index.js
