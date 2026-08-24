# ── API Backend: Node.js + Express ────────────────────────────────────────
# Cloud Run requiere escuchar en el puerto definido por $PORT (default 8080)

FROM node:20-alpine

WORKDIR /app

# Copiar e instalar dependencias primero (cache layer)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copiar código fuente
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
