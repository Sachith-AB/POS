import { Router, type Response } from 'express';
import { pinLoginSchema, employeeCreateSchema, bootstrapAccountSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { SESSION_COOKIE_NAME } from '../lib/auth.js';
import {
  bootstrapOwnerAccount,
  createEmployee,
  hasAnyEmployees,
  listEmployees,
  loginWithPin,
} from '../services/authService.js';

const router = Router();

const isProd = process.env.NODE_ENV === 'production';

function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 12 * 60 * 60 * 1000,
  });
}

/** Public: lets the login screen know whether to show first-run setup instead of the PIN pad. */
router.get(
  '/bootstrap-status',
  asyncHandler(async (_req, res) => {
    res.json({ needsSetup: !(await hasAnyEmployees()) });
  })
);

/** Public, but self-disables — refuses once any employee exists (see bootstrapOwnerAccount). */
router.post(
  '/bootstrap',
  asyncHandler(async (req, res) => {
    const input = bootstrapAccountSchema.parse(req.body);
    const { token, employee } = await bootstrapOwnerAccount(input);
    setSessionCookie(res, token);
    res.status(201).json({ employee });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { pin } = pinLoginSchema.parse(req.body);
    const { token, employee } = await loginWithPin(pin);
    setSessionCookie(res, token);
    res.json({ employee });
  })
);

router.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ employee: req.session });
});

router.get(
  '/employees',
  requireAuth,
  requireRole('OWNER'),
  asyncHandler(async (_req, res) => {
    res.json(await listEmployees());
  })
);

router.post(
  '/employees',
  requireAuth,
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const input = employeeCreateSchema.parse(req.body);
    res.status(201).json(await createEmployee(input));
  })
);

export default router;
