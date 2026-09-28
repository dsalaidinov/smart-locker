import { Router, Request, Response, NextFunction } from 'express';
import { StorePackageUseCase } from '../../application/use-cases/StorePackageUseCase';
import { RetrievePackageUseCase } from '../../application/use-cases/RetrievePackageUseCase';
import { ListLockersUseCase } from '../../application/use-cases/ListLockersUseCase';
import { LockerSize } from '../../domain/value-objects/LockerSize';

const VALID_SIZES: Record<string, LockerSize> = {
  SMALL: LockerSize.SMALL,
  MEDIUM: LockerSize.MEDIUM,
  LARGE: LockerSize.LARGE,
};

export function createLockerRouter(
  storePackageUseCase: StorePackageUseCase,
  retrievePackageUseCase: RetrievePackageUseCase,
  listLockersUseCase: ListLockersUseCase,
): Router {
  const router = Router();

  /**
   * GET /api/lockers
   * Returns real-time availability of all lockers.
   */
  router.get('/lockers', (_req: Request, res: Response) => {
    const lockers = listLockersUseCase.execute();
    res.json({ lockers });
  });

  /**
   * POST /api/packages/store
   * Body: { "packageSize": "SMALL" | "MEDIUM" | "LARGE" }
   */
  router.post(
    '/packages/store',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { packageSize } = req.body as { packageSize?: string };

        if (!packageSize || !(packageSize in VALID_SIZES)) {
          res.status(400).json({
            error: {
              code: 'INVALID_PACKAGE_SIZE',
              message: `Package size must be one of: ${Object.keys(VALID_SIZES).join(', ')}`,
            },
          });
          return;
        }

        const size = VALID_SIZES[packageSize]!;
        const result = await storePackageUseCase.execute({ packageSize: size });

        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * POST /api/packages/retrieve
   * Body: { "lockerId": string, "pickupCode": string }
   */
  router.post(
    '/packages/retrieve',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { lockerId, pickupCode } = req.body as {
          lockerId?: string;
          pickupCode?: string;
        };

        if (!lockerId || !pickupCode) {
          res.status(400).json({
            error: {
              code: 'MISSING_FIELDS',
              message: 'Both lockerId and pickupCode are required.',
            },
          });
          return;
        }

        const result = retrievePackageUseCase.execute({ lockerId, pickupCode });
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
