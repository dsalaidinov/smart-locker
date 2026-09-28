# 🔐 Lockker — Smart Package Locker Management System

A production-grade, clean-architecture Smart Package Locker Management System built with TypeScript, Node.js (Express), and React (Vite). Designed for resilience, correctness under concurrency, and extensibility.

---

## Table of Contents

- [Architecture Decisions](#architecture-decisions)
- [SOLID Principles in Practice](#solid-principles-in-practice)
- [Concurrency Strategy](#concurrency-strategy)
- [Pricing Engine](#pricing-engine)
- [Physical Hardware / IoT Considerations](#physical-hardware--iot-considerations)
- [Project Structure](#project-structure)
- [Quickstart](#quickstart)
- [Testing](#testing)
- [AI Usage Disclosure](#ai-usage-disclosure)

---

## Architecture Decisions

### Why Clean Architecture?

This system follows **Clean Architecture** (Domain-Driven Design boundaries) to enforce strict dependency separation:

```
Presentation → Application → Domain ← Infrastructure
```

- **Domain Layer** (`domain/`): Pure business logic — entities (`Locker`, `Package`, `Allocation`), value objects (`LockerSize`, `LockerStatus`, `PickupCode`), domain exceptions, and pricing strategies. **Zero external dependencies.** This layer can be tested in complete isolation and will survive any infrastructure change (database swap, framework migration).

- **Application Layer** (`application/`): Use cases (`StorePackageUseCase`, `RetrievePackageUseCase`, `ListLockersUseCase`), ports/interfaces (`ILockerRepository`, `IClockProvider`, `IConcurrencyLock`), and services. Orchestrates domain logic without knowing about HTTP, databases, or UI.

- **Infrastructure Layer** (`infrastructure/`): Concrete implementations — `InMemoryLockerRepository` (with state cloning for safe reads), `SystemClock` / `MockClock`, Express HTTP server with routes and error-handling middleware.

- **Presentation Layer** (`frontend/`): Minimal React SPA that consumes the REST API. Completely decoupled — can be swapped for mobile, CLI, or terminal UI.

### Why this matters for production:
- **Testability**: Domain and use cases are tested without spinning up an HTTP server.
- **Swappability**: Moving from in-memory to PostgreSQL requires implementing `ILockerRepository` — zero changes to business logic.
- **Evolvability**: New pricing strategies (flat rate, peak pricing) are added via `IPricingStrategy` without modifying existing code.

---

## SOLID Principles in Practice

| Principle | Implementation |
|-----------|----------------|
| **Single Responsibility** | Each use case handles exactly one workflow: `StorePackageUseCase` handles allocation, `RetrievePackageUseCase` handles retrieval and billing. |
| **Open/Closed** | `IPricingStrategy` interface allows new pricing models (flat, surge, subscription) without modifying `RetrievePackageUseCase`. |
| **Liskov Substitution** | `MockClock` and `SystemClock` are interchangeable via `IClockProvider`. Tests use `MockClock` for deterministic time control. |
| **Interface Segregation** | Ports are minimal: `ILockerRepository` defines only the persistence methods each use case needs. `IConcurrencyLock` has a single method. |
| **Dependency Inversion** | Use cases depend on port interfaces, not concrete classes. The composition root (`main.ts`) wires concrete implementations. |

---

## Concurrency Strategy

### The Problem
Multiple delivery agents may attempt to store packages simultaneously. Without synchronization, two concurrent requests could be assigned the **same locker** — a critical data integrity violation.

### The Solution: Mutex-Protected Critical Section

```
Request A ──┐
Request B ──┤──→ [Mutex Lock] ──→ Find + Allocate ──→ [Unlock] ──→ Response
Request C ──┘
```

- **Implementation**: `MutexConcurrencyLock` wraps the `async-mutex` library, implementing the `IConcurrencyLock` port.
- **Scope**: The entire `StorePackageUseCase.execute()` runs inside `runExclusive()`, ensuring atomic read-check-write of locker state.
- **Guarantees**:
  - If 1 MEDIUM locker remains and 10 concurrent requests arrive for MEDIUM packages, **exactly 1 succeeds** and 9 receive `NoSuitableLockerAvailableException`.
  - Zero overlapping locker assignments under any concurrency load.

### Verified by Integration Tests
- **30 simultaneous requests** → 3 lockers → exactly 3 succeed, 27 fail, zero duplicates.
- **50 simultaneous requests** → 1 locker → exactly 1 succeeds, 49 fail.
- **Mixed-size concurrency** → State remains perfectly consistent.

---

## Pricing Engine

Implements the **Strategy Pattern** via `IPricingStrategy`:

### Tiered Pricing (Default)

| Duration | Rate |
|----------|------|
| Days 1–5 | $1.00/day (base rate) |
| Days 6–10 | $2.00/day (2× base) |
| Days 11+ | $3.00/day (3× base) |

**Day calculation**: `Math.ceil(durationInHours / 24)` — minimum 1 day.

**Deterministic testing**: `MockClock` allows advancing time by hours/days without real-time delays, enabling exact fee verification for any storage duration.

---

## Physical Hardware / IoT Considerations

This software system is designed to map directly to physical smart locker stations:

### Hardware Integration Points

| Component | Physical Implementation | Software Mapping |
|-----------|------------------------|------------------|
| Locker Lock | Solenoid or electromagnetic lock | `Locker.occupy()` / `Locker.release()` triggers lock/unlock command |
| Door Sensor | Reed switch or Hall-effect sensor | `LockerStatus` validation — ensures door is actually closed before confirming storage |
| Display | LCD/LED per locker or central touchscreen | `LockerGrid` component (or embedded UI) |
| Connectivity | MQTT over WiFi, RS-485 wired bus, or LoRaWAN | Infrastructure adapter behind `ILockerRepository` |

### Edge Protocol Architecture

```
[Locker Hardware] ←RS-485/MQTT→ [Edge Controller] ←HTTPS→ [Cloud Backend]
```

- **Edge Controller** (Raspberry Pi / industrial gateway): Runs local firmware, communicates with solenoids and sensors via RS-485 or GPIO. Publishes state changes via MQTT.
- **Offline-First Sync**: Edge controller maintains a local state cache. If cloud connectivity drops, locker operations continue locally. State syncs via event sourcing when connectivity resumes.
- **Security**: Pickup codes are verified locally (hashed on edge device). No cloud dependency for time-critical unlock operations.

### Failure Modes & Resilience
- **Network outage**: Edge device continues to operate autonomously with cached state.
- **Power failure**: Solenoid locks default to **locked** (fail-secure). State recovered from persistent local storage on boot.
- **Sensor malfunction**: Health monitoring via heartbeat — alerts dispatched if door sensor stops responding.

---

## Project Structure

```
lockker/
├── backend/
│   ├── src/
│   │   ├── domain/                # Pure business rules (zero dependencies)
│   │   │   ├── entities/          # Locker, Package, Allocation
│   │   │   ├── value-objects/     # LockerSize, LockerStatus, PickupCode
│   │   │   ├── strategies/        # IPricingStrategy, TieredPricingStrategy
│   │   │   └── exceptions/        # Domain exceptions
│   │   ├── application/           # Use cases & ports
│   │   │   ├── use-cases/         # StorePackage, RetrievePackage, ListLockers
│   │   │   ├── ports/             # ILockerRepository, IClockProvider, IConcurrencyLock
│   │   │   └── services/          # MutexConcurrencyLock
│   │   ├── infrastructure/        # Concrete implementations
│   │   │   ├── persistence/       # InMemoryLockerRepository
│   │   │   ├── clock/             # SystemClock, MockClock
│   │   │   └── http/              # Express app, routes, error handler
│   │   └── main.ts               # Composition root
│   └── tests/
│       ├── unit/                  # Domain & use case tests
│       └── integration/           # API + Concurrency stress tests
├── frontend/                      # Vite + React + TypeScript SPA
│   └── src/
│       ├── components/            # LockerGrid, AgentPanel, CustomerPanel
│       ├── api.ts                 # Type-safe API client
│       └── App.tsx                # Root component
├── docker-compose.yml             # Multi-container orchestration
├── Dockerfile                     # Multi-stage build (backend + frontend)
├── nginx.conf                     # Production reverse proxy
├── Makefile                       # Unified task runner
├── SPEC.md                        # Requirements specification
└── README.md                      # This file
```

---

## Quickstart

### Prerequisites
- Node.js 20+ (LTS)
- npm 10+
- Docker & Docker Compose (optional, for containerized deployment)

### Using Makefile (Recommended)

```bash
make install      # Install all dependencies
make test         # Run all 54 tests
make dev          # Start backend + frontend in parallel
make lint         # Type-check backend & frontend
make build        # Production build
make docker-up    # Start via Docker Compose
make docker-down  # Stop containers
```

### Manual Setup

```bash
# Backend
cd backend
npm ci
npm test          # Run all 54 tests (unit + integration)
npm run dev       # Start dev server on http://localhost:3001

# Frontend
cd frontend
npm ci
npm run dev       # Start Vite dev server on http://localhost:5173
```

The frontend proxies `/api` requests to `http://localhost:3001` during development.

### Docker Deployment

```bash
docker compose up --build -d
# Backend: http://localhost:3001
# Frontend: http://localhost:80 (nginx reverse proxy → backend)
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/lockers` | List all lockers with real-time status |
| `POST` | `/api/packages/store` | Store a package (`{ "packageSize": "SMALL" }`) |
| `POST` | `/api/packages/retrieve` | Retrieve a package (`{ "lockerId": "S1", "pickupCode": "ABC123" }`) |

---

## Testing

```bash
make test
# or: cd backend && npm test
```

### Test Coverage

| Category | Tests | Description |
|----------|-------|-------------|
| Best-Fit Allocation | 9 | Smallest-fit, promotion, rejection when full |
| Pickup Code | 4 | Generation, validation, equality |
| Status Tracking | 2 | OCCUPIED after store, availability count |
| Retrieval Lifecycle | 5 | Success, re-use, state transitions |
| Retrieval Errors | 4 | Wrong code, non-existent, empty, double-pickup |
| Pickup Code Invalidation | 1 | Single-use enforcement |
| Pricing Strategy | 7 | Exact fee calculations (1, 5, 6, 10, 12 days) |
| Time-Based Integration | 6 | MockClock-driven fee verification (12h, 24h, 25h, 6d, 12d) |
| Concurrency Stress (30 req) | 1 | 3 lockers → 3 succeed, 27 fail, zero duplicates |
| Concurrency Stress (50 req) | 1 | 1 locker → 1 succeeds, 49 fail |
| Concurrency Mixed Sizes | 1 | State consistency under mixed-size load |
| API Integration (HTTP) | 12 | Full Express stack: routes, status codes, malformed JSON handling |
| API E2E Lifecycle | 2 | Store → retrieve → re-store full cycle through HTTP |
| **Total** | **54** | |

---

## AI Usage Disclosure

In compliance with Everest Engineering guidelines, the following AI tools were used during the development of this project:

| Tool | Usage |
|------|-------|
| **Google Antigravity (AGY)** | Scaffolding project structure, generating boilerplate code, creating test case matrices, and building UI components. |
| **AI-Assisted Code Generation** | Domain entities, value objects, use case implementations, and Express route handlers were generated with AI assistance and subsequently reviewed, refined, and validated by the developer. |
| **Test Generation** | AI assisted in generating the comprehensive test suite (54 tests), including edge cases for concurrency stress testing, API integration tests, and tiered pricing calculations. |

**All AI-generated code was reviewed, tested, and validated** to ensure correctness, type safety, and adherence to Clean Architecture principles. The developer retains full responsibility for the final codebase.

---

## License

MIT
