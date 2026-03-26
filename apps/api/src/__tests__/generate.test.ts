import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import generateRouter from '../routes/generate.js';
import { errorHandler } from '../utils/errors.js';
import { RANKING_USABILITY_WEIGHT } from '@kulrs/shared';

// Create test app
const app = express();
app.use(express.json());
app.use('/generate', generateRouter);
app.use(errorHandler({ verbose: false }));

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
      expect(response.body.data.colors.length).toBeGreaterThanOrEqual(5);
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
      expect(response.body.data.colors.length).toBeGreaterThanOrEqual(5);
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

  describe('POST /generate/color/related', () => {
    const validColor = { l: 0.6, c: 0.2, h: 220 };

    it('should return all harmony relationship groups for a valid color', async () => {
      const response = await request(app)
        .post('/generate/color/related')
        .send({ color: validColor });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const data = response.body.data;
      expect(data.source).toMatchObject(validColor);
      expect(Array.isArray(data.relationships)).toBe(true);

      const types = data.relationships.map((r: { type: string }) => r.type);
      expect(types).toContain('complementary');
      expect(types).toContain('analogous');
      expect(types).toContain('triadic');
      expect(types).toContain('split-complementary');
      expect(types).toContain('neutral');
    });

    it('each relationship group should have label, description, and colors', async () => {
      const response = await request(app)
        .post('/generate/color/related')
        .send({ color: validColor });

      expect(response.status).toBe(200);
      for (const group of response.body.data.relationships) {
        expect(typeof group.label).toBe('string');
        expect(typeof group.description).toBe('string');
        expect(Array.isArray(group.colors)).toBe(true);
        expect(group.colors.length).toBeGreaterThan(0);
        for (const c of group.colors) {
          expect(typeof c.l).toBe('number');
          expect(typeof c.c).toBe('number');
          expect(typeof c.h).toBe('number');
        }
      }
    });

    it('should reject missing color', async () => {
      const response = await request(app)
        .post('/generate/color/related')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject invalid OKLCH values', async () => {
      const response = await request(app)
        .post('/generate/color/related')
        .send({ color: { l: 2, c: 0.2, h: 220 } }); // l > 1

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /generate/color/suggestions', () => {
    const validColor = { l: 0.6, c: 0.2, h: 220 };

    it('should return ranked palette suggestions for a valid color', async () => {
      const response = await request(app)
        .post('/generate/color/suggestions')
        .send({ color: validColor });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const suggestions = response.body.data;
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBe(4); // default count
    });

    it('each suggestion should have rank, harmony, score, tags, and palette', async () => {
      const response = await request(app)
        .post('/generate/color/suggestions')
        .send({ color: validColor });

      expect(response.status).toBe(200);
      for (const s of response.body.data) {
        expect(typeof s.rank).toBe('number');
        expect(typeof s.harmony).toBe('string');
        expect(typeof s.score).toBe('number');
        expect(s.score).toBeGreaterThanOrEqual(0);
        expect(s.score).toBeLessThanOrEqual(1);
        expect(Array.isArray(s.tags)).toBe(true);
        expect(s.tags.length).toBeGreaterThan(0);
        expect(s.palette).toBeDefined();
        expect(Array.isArray(s.palette.colors)).toBe(true);
        expect(s.palette.metadata.generator).toBeDefined();
      }
    });

    it('suggestions should be sorted best-first (rank 1 has highest score)', async () => {
      const response = await request(app)
        .post('/generate/color/suggestions')
        .send({ color: validColor });

      expect(response.status).toBe(200);
      const suggestions = response.body.data;
      expect(suggestions[0].rank).toBe(1);
      for (let i = 0; i < suggestions.length - 1; i++) {
        expect(suggestions[i].score).toBeGreaterThanOrEqual(
          suggestions[i + 1].score
        );
      }
    });

    it('should return only requested number of suggestions', async () => {
      const response = await request(app)
        .post('/generate/color/suggestions')
        .send({ color: validColor, count: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });

    it('palette metadata should include tags, confidence, and roleHints', async () => {
      const response = await request(app)
        .post('/generate/color/suggestions')
        .send({ color: validColor });

      expect(response.status).toBe(200);
      for (const s of response.body.data) {
        const meta = s.palette.metadata;
        expect(Array.isArray(meta.tags)).toBe(true);
        expect(typeof meta.confidence).toBe('number');
        expect(meta.confidence).toBeGreaterThanOrEqual(0);
        expect(meta.confidence).toBeLessThanOrEqual(1);
        expect(typeof meta.roleHints).toBe('object');
      }
    });

    it('should reject missing color', async () => {
      const response = await request(app)
        .post('/generate/color/suggestions')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject count > 4', async () => {
      const response = await request(app)
        .post('/generate/color/suggestions')
        .send({ color: validColor, count: 5 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Issue #103 – palette metadata fields', () => {
    it('POST /generate/color should include tags, confidence, roleHints in metadata', async () => {
      const response = await request(app)
        .post('/generate/color')
        .send({ color: { l: 0.5, c: 0.15, h: 120 } });

      expect(response.status).toBe(200);
      const meta = response.body.data.metadata;
      expect(Array.isArray(meta.tags)).toBe(true);
      expect(meta.tags.length).toBeGreaterThan(0);
      expect(typeof meta.confidence).toBe('number');
      expect(meta.confidence).toBeGreaterThanOrEqual(0);
      expect(meta.confidence).toBeLessThanOrEqual(1);
      expect(typeof meta.roleHints).toBe('object');
    });

    it('POST /generate/mood should include tags, confidence, roleHints in metadata', async () => {
      const response = await request(app)
        .post('/generate/mood')
        .send({ mood: 'calm ocean' });

      expect(response.status).toBe(200);
      const meta = response.body.data.metadata;
      expect(Array.isArray(meta.tags)).toBe(true);
      expect(typeof meta.confidence).toBe('number');
      expect(typeof meta.roleHints).toBe('object');
    });

    it('POST /generate/image should include tags, confidence, roleHints in metadata', async () => {
      const response = await request(app)
        .post('/generate/image')
        .send({
          pixels: [
            { r: 255, g: 100, b: 50 },
            { r: 50, g: 100, b: 255 },
            { r: 100, g: 200, b: 100 },
          ],
        });

      expect(response.status).toBe(200);
      const meta = response.body.data.metadata;
      expect(Array.isArray(meta.tags)).toBe(true);
      expect(typeof meta.confidence).toBe('number');
      expect(typeof meta.roleHints).toBe('object');
    });
  });
});

// =============================================================================
// Issue #118 – Image-derived palette suggestions
// =============================================================================

describe('POST /generate/image/suggestions', () => {
  const validColors = [
    { l: 0.55, c: 0.2, h: 220 },
    { l: 0.6, c: 0.25, h: 35 },
    { l: 0.4, c: 0.15, h: 120 },
  ];

  it('returns ranked suggestions for valid multi-color input', async () => {
    const response = await request(app)
      .post('/generate/image/suggestions')
      .send({ colors: validColors });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const suggestions = response.body.data;
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBe(4); // default count
  });

  it('each suggestion has rank, harmony, score, tags, palette, usabilityScore, uiViable, semanticRoles, rankingExplanation', async () => {
    const response = await request(app)
      .post('/generate/image/suggestions')
      .send({ colors: validColors });

    expect(response.status).toBe(200);
    for (const s of response.body.data) {
      expect(typeof s.rank).toBe('number');
      expect(typeof s.harmony).toBe('string');
      expect(s.harmony).toMatch(/^image-/);
      expect(typeof s.score).toBe('number');
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(1);
      expect(Array.isArray(s.tags)).toBe(true);
      expect(s.tags).toContain('image');
      expect(s.palette).toBeDefined();
      expect(Array.isArray(s.palette.colors)).toBe(true);
      expect(typeof s.usabilityScore).toBe('number');
      expect(typeof s.uiViable).toBe('boolean');
      expect(typeof s.semanticRoles).toBe('object');
      expect(typeof s.rankingExplanation).toBe('string');
    }
  });

  it('returns only the requested number of suggestions', async () => {
    const response = await request(app)
      .post('/generate/image/suggestions')
      .send({ colors: validColors, count: 2 });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(2);
  });

  it('works with a single color input', async () => {
    const response = await request(app)
      .post('/generate/image/suggestions')
      .send({ colors: [{ l: 0.5, c: 0.2, h: 200 }] });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('rejects missing colors', async () => {
    const response = await request(app)
      .post('/generate/image/suggestions')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('rejects an empty colors array', async () => {
    const response = await request(app)
      .post('/generate/image/suggestions')
      .send({ colors: [] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('rejects more than 5 colors', async () => {
    const tooManyColors = Array.from({ length: 6 }, (_, i) => ({
      l: 0.5,
      c: 0.2,
      h: (i * 60) % 360,
    }));
    const response = await request(app)
      .post('/generate/image/suggestions')
      .send({ colors: tooManyColors });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('rejects count > 4', async () => {
    const response = await request(app)
      .post('/generate/image/suggestions')
      .send({ colors: validColors, count: 5 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('rejects invalid OKLCH color values', async () => {
    const response = await request(app)
      .post('/generate/image/suggestions')
      .send({ colors: [{ l: 2, c: 0.2, h: 220 }] }); // l > 1

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('suggestions are sorted best-first (composite score non-increasing)', async () => {
    const response = await request(app)
      .post('/generate/image/suggestions')
      .send({ colors: validColors });

    expect(response.status).toBe(200);
    const suggestions = response.body.data;
    expect(suggestions[0].rank).toBe(1);
    // Composite score should be non-increasing
    for (let i = 1; i < suggestions.length; i++) {
      const prev = suggestions[i - 1];
      const curr = suggestions[i];
      const prevComposite =
        prev.score * (1 - RANKING_USABILITY_WEIGHT) +
        prev.usabilityScore * RANKING_USABILITY_WEIGHT;
      const currComposite =
        curr.score * (1 - RANKING_USABILITY_WEIGHT) +
        curr.usabilityScore * RANKING_USABILITY_WEIGHT;
      expect(prevComposite).toBeGreaterThanOrEqual(currComposite - 1e-9);
    }
  });
});

