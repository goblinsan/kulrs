import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { getDb } from '../config/database.js';

const router = Router();

router.get('/', async (_req, res) => {
  let dbResponseMs: number | null = null;
  let status: 'ok' | 'degraded' = 'ok';

  try {
    const start = Date.now();
    await getDb().execute(sql`SELECT 1`);
    dbResponseMs = Date.now() - start;
  } catch (err) {
    console.error('Health check DB ping failed:', err);
    status = 'degraded';
  }

  res.status(status === 'ok' ? 200 : 503).json({ status, dbResponseMs });
});

export default router;
