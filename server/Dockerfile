FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gzip \
    hashcat \
    p7zip-full \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/app

COPY server/package.json ./package.json
RUN npm install --omit=dev

COPY server/src ./src
COPY deploy/bootstrap-wordlist.sh /usr/local/bin/bootstrap-wordlist.sh

RUN chmod +x /usr/local/bin/bootstrap-wordlist.sh && mkdir -p /opt/wordlists /srv/hashcat-data

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    DATA_DIR=/srv/hashcat-data \
    WORDLIST_DIR=/opt/wordlists \
    WORDLIST_PATH=/opt/wordlists/rockyou.txt \
    AUTO_DOWNLOAD_WORDLIST=false

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/bootstrap-wordlist.sh"]
CMD ["node", "src/index.js"]
