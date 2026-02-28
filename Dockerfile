# ── Build stage ──────────────────────────────────────────
FROM node:18-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_HASHCAT_BACKEND_URL=""
ENV VITE_HASHCAT_BACKEND_URL=${VITE_HASHCAT_BACKEND_URL}
RUN npm run build

# ── Serve stage ──────────────────────────────────────────
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 4090
CMD ["nginx", "-g", "daemon off;"]
