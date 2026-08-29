import type { NextFunction, Request, Response } from 'express';
import { SESSION_COOKIE_NAME, verifySession, type SessionPayload } from '../lib/auth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  const session = token ? verifySession(token) : null;
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.session = session;
  next();
}

export function requireRole(...roles: SessionPayload['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
