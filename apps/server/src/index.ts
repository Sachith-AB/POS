import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initJobRunner } from './services/jobRunner.js';
import { logger, requestLogger } from './lib/logger.js';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const uploadsDir = process.env.UPLOADS_DIR ?? './uploads';

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(uploadsDir)));

// Register Request Logger Middleware
app.use(requestLogger);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', routes);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.success('SERVER', `POS server running on http://localhost:${PORT}`);
  initJobRunner();
});
