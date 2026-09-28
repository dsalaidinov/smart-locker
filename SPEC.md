# Engineering Rules & Guidelines

- **Language & Runtime:** TypeScript (strict mode enabled), Node.js (LTS), React (Vite).
- **Architecture:** Clean Architecture with strict separation:
  - `domain`: Pure business logic, zero framework dependencies, rich domain entities.
  - `application`: Use cases, ports (interfaces), services.
  - `infrastructure`: Concrete implementations, repositories, HTTP server.
  - `presentation`: UI and controllers.
- **Type Safety:** Absolute zero use of `any`. Explicit return types for public functions and interfaces.
- **Testing Standard:** Test-Driven Development (TDD). Every use-case and domain rule must have a corresponding unit or integration test. Tests must be fast, isolated, and deterministic.
- **Code Completeness:** Never write placeholders, `// TODO`, or incomplete mock functions. All features must be fully implemented.
- **Concurrency:** Ensure atomic operations for shared locker state using Mutex or synchronization locks.


# TASK: Production-Grade Smart Package Locker Management System

You are a Principal Software Engineer. Build a clean, resilient, production-ready Smart Package Locker Management System using TypeScript, Node.js, and a minimal React frontend. 

The solution must strictly adhere to Clean Architecture (Domain-Driven Design boundaries), SOLID principles, Test-Driven Development (TDD), and zero flakiness.

---

## 1. CORE REQUIREMENTS MATRIX

### Level 1: Basic Locker & Package Storage
- Locker sizes: `SMALL`, `MEDIUM`, `LARGE` (strictly ordered: SMALL < MEDIUM < LARGE).
- System supports initializing lockers across all sizes.
- View real-time availability status of all lockers.
- Package assignment rule: Always allocate the **smallest available locker** that can accommodate the package size (`package.size <= locker.size`).
- If no locker fits or all suitable lockers are full: return a descriptive domain error (e.g. `NoSuitableLockerAvailableException`).
- On successful allocation: generate a unique, secure 6-digit alphanumeric pickup code and return `{ lockerId, pickupCode }`.

### Level 2: Package Retrieval & Lifecycle Management
- Customer retrieves package by providing `lockerId` and `pickupCode`.
- Validate combinations:
  - If locker is empty -> return `LockerAlreadyEmptyException`.
  - If pickup code does not match -> return `InvalidPickupCodeException`.
  - If lockerId does not exist -> return `LockerNotFoundException`.
- On valid retrieval:
  - Mark package as retrieved.
  - Revoke/invalidate pickup code (single-use only).
  - Transition locker state back to `AVAILABLE`.

### Level 3: Extended Storage Charges (Pricing Engine)
- Record precise timestamp (`storedAt`) when a package is placed.
- Day definition: Exactly 24 hours from `storedAt` (`Math.ceil(durationInHours / 24)`).
- Implement Strategy Pattern for pricing (`PricingStrategy` interface):
  - **Tiered Pricing Strategy:**
    - Days 1 to 5: Base rate ($1X$/day).
    - Days 6 to 10: $2X$/day.
    - Days 11+: $3X$/day.
    - Day 0 (retrieved within 24 hours): either base 1 day or configurable threshold.
- Inject a mockable `IClockProvider` (`SystemClock` for runtime, `MockClock` for tests) to allow deterministic testing of multi-day storage without real-time delays.
- Retrieval response must return: `{ lockerId, packageId, durationDays, totalStorageFee, currency }`.

### Level 4: High Concurrency & Race Condition Safety (MANDATORY)
- Multiple delivery agents may attempt to store packages concurrently.
- Guarantee:
  - No two concurrent requests can ever be assigned the same locker.
  - Locker availability must remain atomic and consistent.
  - If 1 locker of size M remains and 10 concurrent requests arrive for size M, exactly 1 succeeds and 9 fail gracefully with `NoSuitableLockerAvailableException`.
- Implementation: Use an in-memory synchronization primitive (`async-mutex` or transactional locks) protecting the allocation critical section.

---

## 2. PROJECT ARCHITECTURE & STRUCTURE

Implement Clean Architecture with strict dependency separation:

```text
smart-locker-system/
├── backend/
│   ├── src/
│   │   ├── domain/               # Pure business rules (Zero external dependencies)
│   │   │   ├── entities/         # Locker, Package, Allocation
│   │   │   ├── value-objects/    # LockerSize, LockerStatus, PickupCode
│   │   │   ├── strategies/       # IPricingStrategy, TieredPricingStrategy
│   │   │   └── exceptions/       # DomainExceptions
│   │   ├── application/          # Use cases & ports
│   │   │   ├── use-cases/        # StorePackageUseCase, RetrievePackageUseCase, ListLockersUseCase
│   │   │   ├── ports/            # ILockerRepository, IClockProvider, INotificationService
│   │   │   └── services/         # ConcurrencyLockService (Mutex)
│   │   ├── infrastructure/       # Implementations & framework adapters
│   │   │   ├── persistence/      # InMemoryLockerRepository (thread-safe, state clone)
│   │   │   ├── clock/            # SystemClock, MockClock
│   │   │   └── http/             # Express/Fastify server, routing, error-handling middleware
│   │   └── main.ts
│   └── tests/
│       ├── unit/                 # Domain logic, Best-fit allocation, Tiered pricing tests
│       └── integration/          # Concurrency stress tests (Promise.all with 50+ parallel requests)
├── frontend/                     # Minimal Vite + React + Tailwind UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── LockerGrid.tsx    # Visual matrix of lockers (S/M/L) with live status badges
│   │   │   ├── AgentPanel.tsx    # Form to store package (select size, triggers allocate)
│   │   │   └── CustomerPanel.tsx # Form to retrieve package (lockerId, pickupCode, displays bill)
│   │   └── App.tsx
├── docker-compose.yml
├── Makefile or npm run scripts
└── README.md
3. TESTING REQUIREMENTS (TDD MANDATE)
Provide comprehensive test coverage using Vitest/Jest:

Best-fit Unit Tests: Small package takes Small locker if available. If Small is full, takes Medium. If no fitting locker, rejects.

Pricing Unit Tests: Exact fee calculations for 1 day, 5 days, 6 days, 10 days, 12 days using MockClock.

Retrieval Edge Cases: Incorrect code, non-existent locker, double-pickup attempts.

Concurrency Integration Test (Level 4):

Setup a station with 1 Small, 1 Medium, 1 Large locker.

Fire 30 simultaneous storePackage requests via Promise.all.

Assert: Exactly 3 packages are stored, 27 rejected, zero overlapping locker assignments, state perfectly consistent.

4. MINIMAL FULLSTACK WEB UI
Provide a simple, functional Single Page Application:

Real-time station view: interactive cards showing Locker ID, Size, Status (AVAILABLE green, OCCUPIED red).

Delivery Agent section: Dropdown to pick package size, "Deposit" button, displays generated code and assigned locker.

Customer section: Inputs for Locker ID and Pickup Code, "Unlock & Pay" button, modal showing calculated storage fee and success status.

5. DOCUMENTATION (README.md)
Generate a senior-grade README.md containing:

Architecture Decisions: Why Clean Architecture was chosen, how SOLID principles are applied (Single Responsibility in Use Cases, Open-Closed via PricingStrategy).

Concurrency Strategy: How race conditions and double-allocations are mitigated in Level 4.

Physical Hardware / IoT Considerations: A dedicated section explaining how this system maps to physical lockers in production (solenoid locks, door-state sensors, MQTT/RS-485 edge protocols, offline-first sync).

AI Usage Disclosure: Explicitly disclose the use of AI tools (Cursor/Antigravity) for scaffolding, test-case matrices generation, and UI components in compliance with Everest Engineering guidelines.

Quickstart: Simple commands to run backend, frontend, and tests (npm test, npm run dev).

Proceed to scaffold and write complete, fully-working code without placeholders or // TODO comments.