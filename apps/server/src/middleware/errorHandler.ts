import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    logger.warn('VALIDATION', `${req.method} ${req.originalUrl} failed schema validation:`, err.format());
    return res.status(400).json({ error: 'Validation failed', issues: err.issues });
  }
  if (err instanceof HttpError) {
    logger.warn('HTTP_ERROR', `${req.method} ${req.originalUrl} [${err.status}]: ${err.message}`);
    return res.status(err.status).json({ error: err.message });
  }

  logger.error('SERVER_ERROR', `Unhandled exception on ${req.method} ${req.originalUrl}:`, err);
  return res.status(500).json({ error: 'Internal server error' });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
