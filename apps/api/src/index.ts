import express from 'express';
import { HttpFunction } from '@google-cloud/functions-framework';
import { initializeFirebase } from './config/firebase.js';
import { verifyFirebaseToken } from './middleware/auth.js';
import palettesRouter from './routes/palettes.js';

// Initialize Firebase Admin SDK
initializeFirebase();

const app = express();

// CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:5173',
  ];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send();
    return;
  }

  next();
});

// Body parsing middleware
app.use(express.json());

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
    environment: process.env.NODE_ENV || 'development',
  });
});

// Protected routes - require authentication
app.use('/palettes', verifyFirebaseToken, palettesRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

// Export the HTTP handler for Google Cloud Functions
export const handler: HttpFunction = app;
