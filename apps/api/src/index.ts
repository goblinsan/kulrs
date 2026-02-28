import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { HttpFunction } from '@google-cloud/functions-framework';
import { initializeFirebase } from './config/firebase.js';
import {
  verifyFirebaseToken,
  optionalFirebaseToken,
} from './middleware/auth.js';
import palettesRouter from './routes/palettes.js';
import generateRouter from './routes/generate.js';

// Initialize Firebase Admin SDK
initializeFirebase();

const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Trust Cloud Run / GCF proxy for accurate req.ip
app.set('trust proxy', 1);

// CORS middleware
const isProduction = process.env.NODE_ENV === 'production';
app.use((req, res, next) => {
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || (
    isProduction
      ? ['https://kulrs.com', 'https://www.kulrs.com', 'https://vizail.com']
      : ['http://localhost:5173', 'http://localhost:5174']
  );
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).send();
    return;
  }

  next();
});

// Body parsing middleware with size limit
app.use(express.json({ limit: '100kb' }));

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

/** General limiter — 100 requests / minute / IP */
const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Please try again later' },
});

/** Stricter limiter for write endpoints — 20 requests / minute / IP */
const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Please try again later' },
});

app.use(generalLimiter);

// Health check endpoint (no auth required)
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Hello endpoint for testing (no auth required)
app.get('/hello', (_req, res) => {
  res.status(200).json({
    message: 'Hello from Kulrs API!',
  });
});

// Palette routes - uses optional auth for public endpoints (browse, view)
app.use('/palettes', optionalFirebaseToken, palettesRouter);

// Protected routes - require authentication
app.use('/generate', writeLimiter, verifyFirebaseToken, generateRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  });
});

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: isProduction ? 'An unexpected error occurred' : err.message,
    });
  }
);

// Export the HTTP handler for Google Cloud Functions
export const handler: HttpFunction = app;
