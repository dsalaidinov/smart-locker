import { Request, Response, NextFunction } from 'express';
import { DomainException } from '../../domain/exceptions';

/**
 * HTTP status code mapping for domain exceptions.
 */
const EXCEPTION_STATUS_MAP: Record<string, number> = {
  NO_SUITABLE_LOCKER: 409,      // Conflict — resource exhausted
  LOCKER_NOT_FOUND: 404,        // Not Found
  LOCKER_ALREADY_EMPTY: 409,    // Conflict — invalid state
  INVALID_PICKUP_CODE: 403,     // Forbidden — authorization failed
};

interface HttpSyntaxError extends Error {
  status?: number;
  type?: string;
}

/**
 * Global error-handling middleware.
 * Maps domain exceptions and client payload errors to appropriate HTTP responses.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof DomainException) {
    const statusCode = EXCEPTION_STATUS_MAP[err.code] ?? 400;
    res.status(statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Express body-parser malformed JSON error
  const httpErr = err as HttpSyntaxError;
  if (httpErr.status === 400 && httpErr.type === 'entity.parse.failed') {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON_PAYLOAD',
        message: 'Malformed JSON payload in request body.',
      },
    });
    return;
  }

  // Unexpected errors
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
}
