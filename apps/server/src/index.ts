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

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin or file:// protocol (packaged Electron app) or localhost
    if (!origin || origin === 'null' || origin.startsWith('file://') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
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
