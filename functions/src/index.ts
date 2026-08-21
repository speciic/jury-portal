import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
// You can mount other routes like jury here

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export const api = onRequest(app);
