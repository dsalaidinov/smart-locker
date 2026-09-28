import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createApp } from '../../src/infrastructure/http/app';
import { Locker } from '../../src/domain/entities/Locker';
import { LockerSize } from '../../src/domain/value-objects/LockerSize';
import { InMemoryLockerRepository } from '../../src/infrastructure/persistence/InMemoryLockerRepository';
import { MockClock } from '../../src/infrastructure/clock/MockClock';
import { MutexConcurrencyLock } from '../../src/application/services/MutexConcurrencyLock';
import { TieredPricingStrategy } from '../../src/domain/strategies/TieredPricingStrategy';
import { StorePackageUseCase } from '../../src/application/use-cases/StorePackageUseCase';
import { RetrievePackageUseCase } from '../../src/application/use-cases/RetrievePackageUseCase';
import { ListLockersUseCase } from '../../src/application/use-cases/ListLockersUseCase';

/**
 * API Integration Tests — exercises the full HTTP stack:
 *   Express → Router → UseCase → Domain → Repository
 *
 * Uses supertest to make real HTTP requests against the Express app
 * without starting a server on a port.
 */
describe('API Integration Tests', () => {
  let app: Application;
  let clock: MockClock;

  beforeEach(() => {
    const repository = new InMemoryLockerRepository([
      new Locker('S1', LockerSize.SMALL),
      new Locker('M1', LockerSize.MEDIUM),
      new Locker('L1', LockerSize.LARGE),
    ]);
    clock = new MockClock(new Date('2025-06-01T10:00:00Z'));
    const lock = new MutexConcurrencyLock();
    const pricing = new TieredPricingStrategy(100);

    app = createApp({
      storePackageUseCase: new StorePackageUseCase(repository, clock, lock),
      retrievePackageUseCase: new RetrievePackageUseCase(repository, clock, pricing),
      listLockersUseCase: new ListLockersUseCase(repository),
    });
  });

  // ─── GET /api/lockers ───────────────────────────────────────────

  describe('GET /api/lockers', () => {
    it('should return all lockers with correct shape', async () => {
      const res = await request(app).get('/api/lockers').expect(200);

      expect(res.body.lockers).toHaveLength(3);
      expect(res.body.lockers[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String) as string,
          size: expect.any(String) as string,
          status: 'AVAILABLE',
        }),
      );
    });

    it('should reflect state changes after storage', async () => {
      await request(app)
        .post('/api/packages/store')
        .send({ packageSize: 'SMALL' })
        .expect(201);

      const res = await request(app).get('/api/lockers').expect(200);

      const occupied = (res.body.lockers as Array<{ status: string }>).filter(
        (l) => l.status === 'OCCUPIED',
      );
      expect(occupied).toHaveLength(1);
    });
  });

  // ─── POST /api/packages/store ───────────────────────────────────

  describe('POST /api/packages/store', () => {
    it('should store a package and return 201 with lockerId and pickupCode', async () => {
      const res = await request(app)
        .post('/api/packages/store')
        .send({ packageSize: 'SMALL' })
        .expect(201);

      expect(res.body).toEqual(
        expect.objectContaining({
          lockerId: 'S1',
          packageId: expect.any(String) as string,
          pickupCode: expect.stringMatching(/^[A-Z0-9]{6}$/) as string,
        }),
      );
    });

    it('should return 400 for invalid package size', async () => {
      const res = await request(app)
        .post('/api/packages/store')
        .send({ packageSize: 'XTRA_LARGE' })
        .expect(400);

      expect(res.body.error.code).toBe('INVALID_PACKAGE_SIZE');
    });

    it('should return 400 for missing package size', async () => {
      const res = await request(app)
        .post('/api/packages/store')
        .send({})
        .expect(400);

      expect(res.body.error.code).toBe('INVALID_PACKAGE_SIZE');
    });

    it('should return 400 for malformed JSON payload', async () => {
      const res = await request(app)
        .post('/api/packages/store')
        .set('Content-Type', 'application/json')
        .send('{ invalid json')
        .expect(400);

      expect(res.body.error.code).toBe('INVALID_JSON_PAYLOAD');
    });

    it('should return 409 when no lockers available', async () => {
      // Fill all 3 lockers
      await request(app).post('/api/packages/store').send({ packageSize: 'SMALL' });
      await request(app).post('/api/packages/store').send({ packageSize: 'MEDIUM' });
      await request(app).post('/api/packages/store').send({ packageSize: 'LARGE' });

      const res = await request(app)
        .post('/api/packages/store')
        .send({ packageSize: 'SMALL' })
        .expect(409);

      expect(res.body.error.code).toBe('NO_SUITABLE_LOCKER');
    });
  });

  // ─── POST /api/packages/retrieve ────────────────────────────────

  describe('POST /api/packages/retrieve', () => {
    it('should retrieve a package with correct fee calculation', async () => {
      const storeRes = await request(app)
        .post('/api/packages/store')
        .send({ packageSize: 'SMALL' })
        .expect(201);

      clock.advanceByDays(3);

      const res = await request(app)
        .post('/api/packages/retrieve')
        .send({
          lockerId: storeRes.body.lockerId as string,
          pickupCode: storeRes.body.pickupCode as string,
        })
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          lockerId: storeRes.body.lockerId as string,
          packageId: storeRes.body.packageId as string,
          durationDays: 3,
          totalStorageFee: 300,
          currency: 'USD',
        }),
      );
    });

    it('should return 404 for non-existent locker', async () => {
      const res = await request(app)
        .post('/api/packages/retrieve')
        .send({ lockerId: 'FAKE', pickupCode: 'ABC123' })
        .expect(404);

      expect(res.body.error.code).toBe('LOCKER_NOT_FOUND');
    });

    it('should return 409 for empty locker', async () => {
      const res = await request(app)
        .post('/api/packages/retrieve')
        .send({ lockerId: 'S1', pickupCode: 'ABC123' })
        .expect(409);

      expect(res.body.error.code).toBe('LOCKER_ALREADY_EMPTY');
    });

    it('should return 403 for invalid pickup code', async () => {
      await request(app)
        .post('/api/packages/store')
        .send({ packageSize: 'SMALL' });

      const res = await request(app)
        .post('/api/packages/retrieve')
        .send({ lockerId: 'S1', pickupCode: 'WRONG1' })
        .expect(403);

      expect(res.body.error.code).toBe('INVALID_PICKUP_CODE');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/packages/retrieve')
        .send({ lockerId: 'S1' })
        .expect(400);

      expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('should release locker after successful retrieval', async () => {
      const storeRes = await request(app)
        .post('/api/packages/store')
        .send({ packageSize: 'SMALL' })
        .expect(201);

      await request(app)
        .post('/api/packages/retrieve')
        .send({
          lockerId: storeRes.body.lockerId as string,
          pickupCode: storeRes.body.pickupCode as string,
        })
        .expect(200);

      // Locker should be available again
      const lockersRes = await request(app).get('/api/lockers').expect(200);
      const allAvailable = (lockersRes.body.lockers as Array<{ status: string }>).every(
        (l) => l.status === 'AVAILABLE',
      );
      expect(allAvailable).toBe(true);
    });
  });

  // ─── Full E2E flow ──────────────────────────────────────────────

  describe('Full lifecycle E2E', () => {
    it('should complete store → retrieve → re-store cycle', async () => {
      // 1. Store
      const store1 = await request(app)
        .post('/api/packages/store')
        .send({ packageSize: 'MEDIUM' })
        .expect(201);

      // 2. Retrieve
      clock.advanceByDays(7);
      const retrieve = await request(app)
        .post('/api/packages/retrieve')
        .send({
          lockerId: store1.body.lockerId as string,
          pickupCode: store1.body.pickupCode as string,
        })
        .expect(200);

      // 7 days → 5×$1 + 2×$2 = $9.00
      expect(retrieve.body.totalStorageFee).toBe(900);

      // 3. Re-store in the now-free locker
      const store2 = await request(app)
        .post('/api/packages/store')
        .send({ packageSize: 'SMALL' })
        .expect(201);

      expect(store2.body.lockerId).toBeDefined();
    });
  });
});
