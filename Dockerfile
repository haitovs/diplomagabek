# ── Build stage: Vite frontend ────────────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV VITE_HASHCAT_BACKEND_URL=/api
RUN npm run build

# ── Runtime stage: nginx + hashcat API in one container ──
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    cpulimit \
    curl \
    gzip \
    hashcat \
    nginx \
    p7zip-full \
  && rm -rf /var/lib/apt/lists/*

# ── Frontend: copy built assets + nginx config ───────────
COPY --from=build /app/dist /usr/share/nginx/html
RUN rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf
COPY nginx.unified.conf /etc/nginx/conf.d/app.conf

# ── Backend: install server dependencies ─────────────────
WORKDIR /srv/app
COPY server/package.json ./package.json
RUN npm install --omit=dev

COPY server/src ./src
COPY deploy/bootstrap-wordlist.sh /usr/local/bin/bootstrap-wordlist.sh
COPY deploy/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/bootstrap-wordlist.sh /usr/local/bin/entrypoint.sh \
 && mkdir -p /opt/wordlists /srv/hashcat-data

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    DATA_DIR=/srv/hashcat-data \
    WORDLIST_DIR=/opt/wordlists \
    WORDLIST_PATH=/opt/wordlists/rockyou.txt \
    AUTO_DOWNLOAD_WORDLIST=true \
    WORDLIST_URL=https://github.com/brannondorsey/naive-hashcat/releases/download/data/rockyou.txt \
    HASHCAT_CPU_LIMIT_PERCENT=30 \
    HASHCAT_WORKLOAD_PROFILE=1 \
    HASHCAT_USE_CPULIMIT=true

EXPOSE 4090

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
