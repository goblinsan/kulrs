import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import generateRouter from '../routes/generate.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/generate', generateRouter);

describe('Generate Routes', () => {
  describe('POST /generate/color', () => {
    it('should generate palette from valid base color', async () => {
      const response = await request(app)
        .post('/generate/color')
        .send({
          color: {
            l: 0.6,
            c: 0.2,
            h: 220,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.colors).toBeDefined();
      expect(response.body.data.colors.length).toBeGreaterThanOrEqual(8);
      expect(response.body.data.colors.length).toBeLessThanOrEqual(12);
      expect(response.body.data.metadata.generator).toBe('color');
    });

    it('should reject invalid lightness value', async () => {
      const response = await request(app)
        .post('/generate/color')
        .send({
          color: {
            l: 1.5, // Invalid: > 1
            c: 0.2,
            h: 220,
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject invalid chroma value', async () => {
      const response = await request(app)
        .post('/generate/color')
        .send({
          color: {
            l: 0.6,
            c: 0.8, // Invalid: > 0.4
            h: 220,
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject invalid hue value', async () => {
      const response = await request(app)
        .post('/generate/color')
        .send({
          color: {
            l: 0.6,
            c: 0.2,
            h: 400, // Invalid: > 360
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject missing color object', async () => {
      const response = await request(app).post('/generate/color').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /generate/mood', () => {
    it('should generate palette from valid mood text', async () => {
      const response = await request(app).post('/generate/mood').send({
        mood: 'calm ocean sunset',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.colors).toBeDefined();
      expect(response.body.data.colors.length).toBeGreaterThanOrEqual(5);
      expect(response.body.data.colors.length).toBeLessThanOrEqual(12);
      expect(response.body.data.metadata.generator).toBe('mood');
      expect(response.body.data.metadata.explanation).toContain(
        'calm ocean sunset'
      );
    });

    it('should be deterministic without seed', async () => {
      const mood = 'energetic summer day';
      const response1 = await request(app)
        .post('/generate/mood')
        .send({ mood });
      const response2 = await request(app)
        .post('/generate/mood')
        .send({ mood });

      expect(response1.body.data.colors.length).toBe(
        response2.body.data.colors.length
      );
      // Check first color matches
      expect(response1.body.data.colors[0].color.l).toBeCloseTo(
        response2.body.data.colors[0].color.l,
        5
      );
    });

    it('should be deterministic with explicit seed', async () => {
      const mood = 'random mood';
      const seed = 12345;
      const response1 = await request(app)
        .post('/generate/mood')
        .send({ mood, seed });
      const response2 = await request(app)
        .post('/generate/mood')
        .send({ mood, seed });

      expect(response1.body.data.colors.length).toBe(
        response2.body.data.colors.length
      );
      expect(response1.body.data.colors[0].color.h).toBeCloseTo(
        response2.body.data.colors[0].color.h,
        5
      );
    });

    it('should reject empty mood text', async () => {
      const response = await request(app).post('/generate/mood').send({
        mood: '',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject mood text that is too long', async () => {
      const response = await request(app)
        .post('/generate/mood')
        .send({
          mood: 'a'.repeat(501), // > 500 chars
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject missing mood', async () => {
      const response = await request(app).post('/generate/mood').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /generate/image', () => {
    it('should generate palette from valid pixel data', async () => {
      const response = await request(app)
        .post('/generate/image')
        .send({
          pixels: [
            { r: 255, g: 100, b: 50 },
            { r: 255, g: 120, b: 60 },
            { r: 50, g: 100, b: 255 },
            { r: 60, g: 110, b: 255 },
            { r: 100, g: 255, b: 100 },
            { r: 110, g: 255, b: 110 },
            { r: 200, g: 200, b: 200 },
            { r: 50, g: 50, b: 50 },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.colors).toBeDefined();
      expect(response.body.data.colors.length).toBeGreaterThanOrEqual(8);
      expect(response.body.data.colors.length).toBeLessThanOrEqual(12);
      expect(response.body.data.metadata.generator).toBe('image');
    });

    it('should reject invalid RGB values (> 255)', async () => {
      const response = await request(app)
        .post('/generate/image')
        .send({
          pixels: [
            { r: 300, g: 100, b: 50 }, // Invalid: r > 255
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject invalid RGB values (< 0)', async () => {
      const response = await request(app)
        .post('/generate/image')
        .send({
          pixels: [
            { r: -10, g: 100, b: 50 }, // Invalid: r < 0
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject non-integer RGB values', async () => {
      const response = await request(app)
        .post('/generate/image')
        .send({
          pixels: [
            { r: 100.5, g: 100, b: 50 }, // Invalid: r is float
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject empty pixel array', async () => {
      const response = await request(app).post('/generate/image').send({
        pixels: [],
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject too many pixels (> 10000)', async () => {
      const pixels = Array(10001).fill({ r: 100, g: 100, b: 100 });
      const response = await request(app).post('/generate/image').send({
        pixels,
      });

      // Could be 400 (validation) or 413 (payload too large from express)
      expect([400, 413]).toContain(response.status);
    });

    it('should reject missing pixels', async () => {
      const response = await request(app).post('/generate/image').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });
});
