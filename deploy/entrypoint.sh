#!/usr/bin/env bash
set -euo pipefail

# ── Download wordlist if configured ──────────────────────
# bootstrap-wordlist.sh uses exec "$@" at the end, so we
# pass a harmless command and let it finish.
/usr/local/bin/bootstrap-wordlist.sh true

# ── Start nginx in the background ────────────────────────
echo "[entrypoint] Starting nginx on :4090"
nginx

# ── Start hashcat API server in the foreground ───────────
echo "[entrypoint] Starting hashcat API on :${PORT:-8080}"
exec node /srv/app/src/index.js
