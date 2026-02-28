/**
 * Typed HTTP error classes for the Kulrs API.
 *
 * Throw these from route handlers or service methods and the centralized
 * error middleware in index.ts will serialise them into a consistent JSON
 * response:  `{ error: <name>, message: <string> }`
 */

export class AppError extends Error {
  /** HTTP status code to send back to the client. */
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    // Ensure instanceof checks work with TS downlevel compilation
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, message);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

/**
 * Validation errors carry optional structured details (e.g. Zod issues).
 */
export class ValidationError extends AppError {
  readonly details?: unknown;

  constructor(message = 'Validation failed', details?: unknown) {
    super(400, message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Express async helper (Express 4 doesn't auto-forward async rejections)
// ---------------------------------------------------------------------------

import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express route handler so that rejected promises
 * are forwarded to the centralized error middleware via `next(err)`.
 *
 * Usage:  `router.get('/foo', asyncHandler(async (req, res) => { … }));`
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Centralized Express error-handling middleware.
 *
 * - Recognises `AppError` subclasses and responds with the appropriate
 *   HTTP status code + JSON body.
 * - Falls through to a generic 500 for unexpected errors.
 *
 * Mount this **after** all routes:
 * ```ts
 * app.use(errorHandler());
 * ```
 */
export function errorHandler(
  options: { verbose?: boolean } = {}
): (err: Error, req: Request, res: Response, next: NextFunction) => void {
  const verbose = options.verbose ?? process.env.NODE_ENV !== 'production';

  // Express requires all 4 params for error middleware detection
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err, _req, res, _next) => {
    if (err instanceof AppError) {
      const body: Record<string, unknown> = {
        error: err.message,
      };
      if (err instanceof ValidationError && err.details) {
        body.details = err.details;
      }
      res.status(err.statusCode).json(body);
      return;
    }

    // Unexpected / untyped error — respect status from HTTP-aware errors (e.g. body-parser)
    const status =
      (err as unknown as { status?: number }).status ??
      (err as unknown as { statusCode?: number }).statusCode ??
      500;
    console.error('Unhandled error:', err);
    res.status(status).json({
      error: status === 500 ? 'Internal Server Error' : err.message,
      message: verbose ? err.message : 'An unexpected error occurred',
    });
  };
}
