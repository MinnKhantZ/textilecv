import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import resumeRouter from './routes/resume';
import coverLetterRouter from './routes/coverLetter';
import starRouter from './routes/starAnswers';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  })
);
app.use(express.json({ limit: '10mb' }));

app.use('/generate-resume', resumeRouter);
app.use('/generate-cover-letter', coverLetterRouter);
app.use('/generate-star-answers', starRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Career Agent backend running on port ${PORT}`);
});
