# Build stage: frontend (Vite SPA)
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json vite.config.ts index.html tailwind.config.js postcss.config.js ./
COPY src ./src

# Same-origin: the backend serves this build directly, so /api needs no host.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Build stage: backend (Express API)
FROM node:20-alpine AS backend-builder

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/tsconfig.json ./
COPY server/src ./src

RUN npm run build

# Runtime stage — a single container serving both the API and the built SPA
FROM node:20-alpine

WORKDIR /app/server

RUN apk add --no-cache dumb-init

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY --from=backend-builder /app/server/dist ./dist
COPY --from=frontend-builder /app/dist ./public

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { if (r.statusCode !== 200) process.exit(1) })"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/index.js"]
