import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const mockExecute = jest.fn<() => Promise<unknown>>();

jest.unstable_mockModule('../config/database.js', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

const { default: healthRouter } = await import('../routes/health.js');

const app = express();
app.use('/health', healthRouter);

describe('GET /health', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it('returns status ok and a numeric dbResponseMs when db is healthy', async () => {
    mockExecute.mockResolvedValue({});

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.dbResponseMs).toBe('number');
    expect(response.body.dbResponseMs).toBeGreaterThanOrEqual(0);
  });

  it('returns status degraded and null dbResponseMs when db fails', async () => {
    mockExecute.mockRejectedValue(new Error('Connection refused'));

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.dbResponseMs).toBeNull();
  });
});
