.PHONY: install test dev build docker-up docker-down lint clean

# ─── Install ─────────────────────────────────────────────────────
install:
	cd backend && npm ci
	cd frontend && npm ci

# ─── Development ─────────────────────────────────────────────────
dev-backend:
	cd backend && npm run dev

dev-frontend:
	cd frontend && npm run dev

dev:
	@echo "Starting backend and frontend in parallel..."
	@$(MAKE) -j2 dev-backend dev-frontend

# ─── Testing ─────────────────────────────────────────────────────
test:
	cd backend && npm test

test-watch:
	cd backend && npm run test:watch

# ─── Type Check & Lint ───────────────────────────────────────────
lint:
	cd backend && npx tsc --noEmit
	cd frontend && npx tsc --noEmit
	cd frontend && npm run lint

# ─── Build ───────────────────────────────────────────────────────
build:
	cd backend && npx tsc
	cd frontend && npm run build

# ─── Docker ──────────────────────────────────────────────────────
docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

# ─── Clean ───────────────────────────────────────────────────────
clean:
	rm -rf backend/dist frontend/dist
	rm -rf backend/node_modules frontend/node_modules
