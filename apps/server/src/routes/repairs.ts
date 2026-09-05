import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import bwipjs from 'bwip-js';
import { repairTicketCreateSchema, repairTicketUpdateSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createRepairTicket,
  getRepairTicket,
  listRepairTickets,
  updateRepairTicket,
  checkRecentCustomerSale,
  listUncollectedRepairTickets,
  sendUncollectedSmsReminders,
} from '../services/repairService.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Configure Multer for device photo capture
const uploadsDir = process.env.UPLOADS_DIR ?? './uploads';
const repairsUploadsDir = path.join(uploadsDir, 'repairs');

if (!fs.existsSync(repairsUploadsDir)) {
  fs.mkdirSync(repairsUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, repairsUploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `photo-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Check if customer phone has a sale within 3 days (Q4)
router.get(
  '/recent-sale-check',
  requireAuth,
  asyncHandler(async (req, res) => {
    const phone = req.query.phone as string;
    if (!phone) return res.status(400).json({ error: 'Phone parameter required' });
    const result = await checkRecentCustomerSale(phone);
    res.json(result);
  })
);

// Get uncollected repairs list sorted by uncollected days (Q25)
router.get(
  '/uncollected',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const result = await listUncollectedRepairTickets();
    res.json(result);
  })
);

// Send bulk or selected SMS reminders for uncollected repairs (Q25)
router.post(
  '/uncollected/send-sms',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { ticketIds } = req.body || {};
    const result = await sendUncollectedSmsReminders(ticketIds);
    res.json(result);
  })
);

// 1. List repairs
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status, search, page, limit } = req.query;
    const result = await listRepairTickets({
      status: status as string,
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  })
);

// 2. Get repair details
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getRepairTicket(req.params.id));
  })
);

// 3. Create repair ticket
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = repairTicketCreateSchema.parse(req.body);
    const ticket = await createRepairTicket(input, req.session!.employeeId);
    res.status(201).json(ticket);
  })
);

// 4. Update repair ticket details / status
router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = repairTicketUpdateSchema.parse(req.body);
    const ticket = await updateRepairTicket(req.params.id, input, req.session!.employeeId);
    res.json(ticket);
  })
);

// 5. Render barcode image for repair slip
router.get(
  '/:id/barcode',
  requireAuth,
  asyncHandler(async (req, res) => {
    const ticket = await getRepairTicket(req.params.id);
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: ticket.ticketNumber,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
    });
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  })
);

// 6. Upload photo for repair ticket
router.post(
  '/:id/photos',
  requireAuth,
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }

    const ticket = await getRepairTicket(req.params.id);
    const photoPath = `/uploads/repairs/${req.file.filename}`;

    const updated = await prisma.repairTicket.update({
      where: { id: req.params.id },
      data: {
        photos: [...ticket.photos, photoPath],
      },
    });

    res.json(updated);
  })
);

// 7. Delete photo from repair ticket
router.delete(
  '/:id/photos/:index',
  requireAuth,
  asyncHandler(async (req, res) => {
    const ticket = await getRepairTicket(req.params.id);
    const index = Number(req.params.index);

    if (isNaN(index) || index < 0 || index >= ticket.photos.length) {
      return res.status(400).json({ error: 'Invalid photo index' });
    }

    const photoPath = ticket.photos[index];
    const newPhotos = ticket.photos.filter((_, i) => i !== index);

    // Update database
    const updated = await prisma.repairTicket.update({
      where: { id: req.params.id },
      data: { photos: newPhotos },
    });

    // Try deleting from disk
    const fullPath = path.join(uploadsDir, 'repairs', path.basename(photoPath));
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err) {
      console.error(`Failed to delete photo file ${fullPath}:`, err);
    }

    res.json(updated);
  })
);

export default router;
