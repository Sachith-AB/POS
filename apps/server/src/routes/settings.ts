import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { shopSettingsSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getSettings, updateSettings } from '../services/settingsService.js';
import { recordAudit } from '../services/auditService.js';

const router = Router();

const uploadsDir = process.env.UPLOADS_DIR ?? './uploads';
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `logo-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Logo must be an image file'));
    }
    cb(null, true);
  },
});

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await getSettings());
  })
);

router.patch(
  '/',
  requireAuth,
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const input = shopSettingsSchema.partial().parse(req.body);
    const before = await getSettings();
    const updated = await updateSettings(input);
    await recordAudit({
      employeeId: req.session!.employeeId,
      action: 'UPDATE_SETTINGS',
      entity: 'ShopSettings',
      entityId: updated.id,
      before,
      after: updated,
    });
    res.json(updated);
  })
);

router.post(
  '/logo',
  requireAuth,
  requireRole('OWNER'),
  upload.single('logo'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const logoUrl = `/uploads/${req.file.filename}`;
    const updated = await updateSettings({ logoUrl });
    res.json(updated);
  })
);

export default router;
