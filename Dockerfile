FROM node:20-alpine AS base
WORKDIR /app

# ─── Backend ─────────────────────────────────────────────────────
FROM base AS backend-deps
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

FROM base AS backend-build
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npx tsc

FROM base AS backend
COPY --from=backend-deps /app/node_modules ./node_modules
COPY --from=backend-build /app/dist ./dist
COPY backend/package.json ./
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main.js"]

# ─── Frontend ────────────────────────────────────────────────────
FROM base AS frontend-build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine AS frontend
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
