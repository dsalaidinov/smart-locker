import express, { Application } from 'express';
import cors from 'cors';
import { createLockerRouter } from './routes';
import { errorHandler } from './errorHandler';
import { StorePackageUseCase } from '../../application/use-cases/StorePackageUseCase';
import { RetrievePackageUseCase } from '../../application/use-cases/RetrievePackageUseCase';
import { ListLockersUseCase } from '../../application/use-cases/ListLockersUseCase';

export interface AppDependencies {
  storePackageUseCase: StorePackageUseCase;
  retrievePackageUseCase: RetrievePackageUseCase;
  listLockersUseCase: ListLockersUseCase;
}

/**
 * Creates and configures the Express application.
 * Follows Dependency Injection — all use cases are injected.
 */
export function createApp(deps: AppDependencies): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Mount API routes
  const router = createLockerRouter(
    deps.storePackageUseCase,
    deps.retrievePackageUseCase,
    deps.listLockersUseCase,
  );
  app.use('/api', router);

  // Global error handler (must be after routes)
  app.use(errorHandler);

  return app;
}
