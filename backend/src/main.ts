import { createApp } from './infrastructure/http/app';
import { Locker } from './domain/entities/Locker';
import { LockerSize } from './domain/value-objects/LockerSize';
import { InMemoryLockerRepository } from './infrastructure/persistence/InMemoryLockerRepository';
import { SystemClock } from './infrastructure/clock/SystemClock';
import { MutexConcurrencyLock } from './application/services/MutexConcurrencyLock';
import { TieredPricingStrategy } from './domain/strategies/TieredPricingStrategy';
import { StorePackageUseCase } from './application/use-cases/StorePackageUseCase';
import { RetrievePackageUseCase } from './application/use-cases/RetrievePackageUseCase';
import { ListLockersUseCase } from './application/use-cases/ListLockersUseCase';

// --- Composition Root ---

// Initialize locker station: 5 SMALL, 3 MEDIUM, 2 LARGE
const initialLockers: Locker[] = [
  ...Array.from({ length: 5 }, (_, i) => new Locker(`S${i + 1}`, LockerSize.SMALL)),
  ...Array.from({ length: 3 }, (_, i) => new Locker(`M${i + 1}`, LockerSize.MEDIUM)),
  ...Array.from({ length: 2 }, (_, i) => new Locker(`L${i + 1}`, LockerSize.LARGE)),
];

// Infrastructure
const repository = new InMemoryLockerRepository(initialLockers);
const clock = new SystemClock();
const concurrencyLock = new MutexConcurrencyLock();
const pricingStrategy = new TieredPricingStrategy(100); // $1.00 base rate

// Use Cases
const storePackageUseCase = new StorePackageUseCase(repository, clock, concurrencyLock);
const retrievePackageUseCase = new RetrievePackageUseCase(repository, clock, pricingStrategy);
const listLockersUseCase = new ListLockersUseCase(repository);

// App
const app = createApp({
  storePackageUseCase,
  retrievePackageUseCase,
  listLockersUseCase,
});

const PORT = process.env['PORT'] ?? 3001;

app.listen(PORT, () => {
  console.log(`🔐 Smart Locker System API running on http://localhost:${PORT}`);
  console.log(`📦 Station: ${initialLockers.length} lockers (5S, 3M, 2L)`);
});
