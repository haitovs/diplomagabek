#!/usr/bin/env bash
set -euo pipefail

AUTO_DOWNLOAD_WORDLIST="${AUTO_DOWNLOAD_WORDLIST:-false}"
WORDLIST_DIR="${WORDLIST_DIR:-/opt/wordlists}"
WORDLIST_PATH="${WORDLIST_PATH:-${WORDLIST_DIR}/rockyou.txt}"
WORDLIST_URL="${WORDLIST_URL:-https://github.com/brannondorsey/naive-hashcat/releases/download/data/rockyou.txt}"
WORDLIST_SHA256="${WORDLIST_SHA256:-}"

mkdir -p "${WORDLIST_DIR}"

if [[ "${AUTO_DOWNLOAD_WORDLIST}" != "true" ]]; then
  echo "[bootstrap-wordlist] AUTO_DOWNLOAD_WORDLIST=false. Skipping download."
  exec "$@"
fi

if [[ -s "${WORDLIST_PATH}" ]]; then
  echo "[bootstrap-wordlist] Existing wordlist found at ${WORDLIST_PATH}."
  exec "$@"
fi

tmp_file="$(mktemp)"
cleanup() {
  rm -f "${tmp_file}"
}
trap cleanup EXIT

echo "[bootstrap-wordlist] Downloading wordlist archive..."
curl -fL --retry 3 --retry-delay 4 "${WORDLIST_URL}" -o "${tmp_file}"

case "${WORDLIST_URL}" in
  *.txt)
    mv "${tmp_file}" "${WORDLIST_PATH}"
    trap - EXIT
    ;;
  *.gz)
    gzip -dc "${tmp_file}" > "${WORDLIST_PATH}"
    ;;
  *.7z)
    7z e -so "${tmp_file}" > "${WORDLIST_PATH}"
    ;;
  *)
    echo "[bootstrap-wordlist] Unsupported extension in WORDLIST_URL=${WORDLIST_URL}" >&2
    exit 1
    ;;
esac

if [[ -n "${WORDLIST_SHA256}" ]]; then
  echo "${WORDLIST_SHA256}  ${WORDLIST_PATH}" | sha256sum -c -
fi

chmod 640 "${WORDLIST_PATH}"
echo "[bootstrap-wordlist] Wordlist is ready: ${WORDLIST_PATH}"

exec "$@"
