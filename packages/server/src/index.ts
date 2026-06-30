import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pathToFileURL } from 'url';

import resumeRouter from './routes/resume.js';
import coverLetterRouter from './routes/coverLetter.js';
import starRouter from './routes/starAnswers.js';
import uploadsRouter from './routes/uploads.js';
import logsRouter from './routes/logs.js';
import profileRouter from './routes/profile.js';

export interface ServerConfig {
  allowedOrigins?: string[];
}

export function createApp(config: ServerConfig = {}): express.Application {
  const app = express();

  const allowedOrigins =
    config.allowedOrigins ??
    (process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174']);

  app.use(
    cors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      credentials: false,
    })
  );

  app.use(express.json({ limit: '10mb' }));

  app.use('/generate-resume', resumeRouter);
  app.use('/generate-cover-letter', coverLetterRouter);
  app.use('/generate-star-answers', starRouter);
  app.use('/uploads', uploadsRouter);
  app.use('/logs', logsRouter);
  app.use('/profile', profileRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}

// Auto-start only when this file is run directly (not imported as a library)
const isMain = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  const PORT = Number(process.env.PORT) || 3001;
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`TextileCV backend running on port ${PORT}`);
  });
}

export default createApp;
