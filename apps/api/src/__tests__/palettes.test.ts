import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// ---------------------------------------------------------------------------
// Mock paletteService before importing the router (ESM mock hoisting)
// ---------------------------------------------------------------------------

const mockGetAllTags = jest.fn<() => Promise<unknown>>();
const mockBrowsePalettes = jest.fn<() => Promise<unknown>>();
const mockGetRelatedPalettes = jest.fn<() => Promise<unknown>>();
const mockGetPaletteById = jest.fn<() => Promise<unknown>>();
const mockGetOrCreateUser = jest.fn<() => Promise<unknown>>();
const mockGetOrCreateAnonymousUser = jest.fn<() => Promise<unknown>>();
const mockGetUserPalettes = jest.fn<() => Promise<unknown>>();
const mockLikePalette = jest.fn<() => Promise<unknown>>();
const mockUnlikePalette = jest.fn<() => Promise<unknown>>();
const mockGetLikeInfo = jest.fn<() => Promise<unknown>>();
const mockSavePalette = jest.fn<() => Promise<unknown>>();
const mockCreatePalette = jest.fn<() => Promise<unknown>>();
const mockDeletePalette = jest.fn<() => Promise<unknown>>();
const mockRemixPalette = jest.fn<() => Promise<unknown>>();
const mockUpdatePaletteColors = jest.fn<() => Promise<unknown>>();

jest.unstable_mockModule('../services/palette.service.js', () => ({
  paletteService: {
    getAllTags: mockGetAllTags,
    browsePalettes: mockBrowsePalettes,
    getRelatedPalettes: mockGetRelatedPalettes,
    getPaletteById: mockGetPaletteById,
    getOrCreateUser: mockGetOrCreateUser,
    getOrCreateAnonymousUser: mockGetOrCreateAnonymousUser,
    getUserPalettes: mockGetUserPalettes,
    likePalette: mockLikePalette,
    unlikePalette: mockUnlikePalette,
    getLikeInfo: mockGetLikeInfo,
    savePalette: mockSavePalette,
    createPalette: mockCreatePalette,
    deletePalette: mockDeletePalette,
    remixPalette: mockRemixPalette,
    updatePaletteColors: mockUpdatePaletteColors,
  },
}));

const { default: palettesRouter } = await import('../routes/palettes.js');
const { errorHandler } = await import('../utils/errors.js');

const app = express();
app.use(express.json());
app.use('/palettes', palettesRouter);
app.use(errorHandler({ verbose: false }));

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_TAGS = [
  { id: 'tag-1', name: 'Cool', slug: 'cool', description: 'Cool colors' },
  { id: 'tag-2', name: 'Warm', slug: 'warm', description: 'Warm colors' },
  { id: 'tag-3', name: 'Nature', slug: 'nature', description: 'Nature tones' },
  { id: 'tag-4', name: 'Serene', slug: 'serene', description: 'Calm palettes' },
];

const PAL_ID_1 = '11111111-1111-4111-8111-111111111111';
const PAL_ID_2 = '22222222-2222-4222-8222-222222222222';
const PAL_ID_3 = '33333333-3333-4333-8333-333333333333';

const SAMPLE_PALETTE = {
  id: PAL_ID_1,
  name: 'Ocean Breeze',
  description: 'Cool ocean colors',
  userId: 'user-1',
  isPublic: true,
  likesCount: 5,
  savesCount: 2,
  createdAt: new Date('2025-01-01'),
  colors: [
    { id: 'col-1', hexValue: '#0077BE', position: 0, name: 'Deep Blue' },
    { id: 'col-2', hexValue: '#00C9FF', position: 1, name: 'Sky Blue' },
  ],
  userLiked: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /palettes/tags', () => {
  beforeEach(() => {
    mockGetAllTags.mockReset();
  });

  it('returns the list of all tags', async () => {
    mockGetAllTags.mockResolvedValue(SAMPLE_TAGS);

    const res = await request(app).get('/palettes/tags');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(4);
    expect(res.body.data[0]).toMatchObject({ slug: 'cool', name: 'Cool' });
  });

  it('returns an empty array when no tags exist', async () => {
    mockGetAllTags.mockResolvedValue([]);

    const res = await request(app).get('/palettes/tags');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('sets a long-lived Cache-Control header', async () => {
    mockGetAllTags.mockResolvedValue(SAMPLE_TAGS);

    const res = await request(app).get('/palettes/tags');

    expect(res.headers['cache-control']).toContain('max-age=300');
  });
});

describe('GET /palettes (tag filter)', () => {
  beforeEach(() => {
    mockBrowsePalettes.mockReset();
  });

  it('passes tags to browsePalettes when ?tags= is provided', async () => {
    mockBrowsePalettes.mockResolvedValue([SAMPLE_PALETTE]);

    const res = await request(app).get('/palettes?tags=cool,nature');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockBrowsePalettes).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['cool', 'nature'] })
    );
  });

  it('passes q to browsePalettes when ?q= is provided', async () => {
    mockBrowsePalettes.mockResolvedValue([SAMPLE_PALETTE]);

    const res = await request(app).get('/palettes?q=ocean');

    expect(res.status).toBe(200);
    expect(mockBrowsePalettes).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'ocean' })
    );
  });

  it('truncates q to 100 characters', async () => {
    mockBrowsePalettes.mockResolvedValue([]);

    const longQuery = 'a'.repeat(200);
    const res = await request(app).get(`/palettes?q=${longQuery}`);

    expect(res.status).toBe(200);
    const callArg = (
      mockBrowsePalettes.mock.calls[0] as unknown as [{ q?: string }]
    )[0];
    expect(callArg.q?.length).toBeLessThanOrEqual(100);
  });

  it('passes undefined tags when no ?tags= is provided', async () => {
    mockBrowsePalettes.mockResolvedValue([SAMPLE_PALETTE]);

    const res = await request(app).get('/palettes');

    expect(res.status).toBe(200);
    expect(mockBrowsePalettes).toHaveBeenCalledWith(
      expect.objectContaining({ tags: undefined })
    );
  });

  it('returns an empty array when browsePalettes returns nothing', async () => {
    mockBrowsePalettes.mockResolvedValue([]);

    const res = await request(app).get('/palettes?tags=nonexistent');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /palettes/:id/related', () => {
  beforeEach(() => {
    mockGetRelatedPalettes.mockReset();
  });

  it('returns related palettes for a valid id', async () => {
    const related = [
      { ...SAMPLE_PALETTE, id: PAL_ID_2, name: 'Nordic Frost' },
      { ...SAMPLE_PALETTE, id: PAL_ID_3, name: 'Forest Canopy' },
    ];
    mockGetRelatedPalettes.mockResolvedValue(related);

    const res = await request(app).get(`/palettes/${PAL_ID_1}/related`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('forwards limit query param', async () => {
    mockGetRelatedPalettes.mockResolvedValue([]);

    const res = await request(app).get(`/palettes/${PAL_ID_1}/related?limit=3`);

    expect(res.status).toBe(200);
    expect(mockGetRelatedPalettes).toHaveBeenCalledWith(
      PAL_ID_1,
      expect.objectContaining({ limit: 3 })
    );
  });

  it('clamps limit to max 20', async () => {
    mockGetRelatedPalettes.mockResolvedValue([]);

    const res = await request(app).get(
      `/palettes/${PAL_ID_1}/related?limit=99`
    );

    expect(res.status).toBe(200);
    const callArg = (
      mockGetRelatedPalettes.mock.calls[0] as unknown as [
        string,
        { limit: number },
      ]
    )[1];
    expect(callArg.limit).toBeLessThanOrEqual(20);
  });

  it('returns an empty array when no related palettes exist', async () => {
    mockGetRelatedPalettes.mockResolvedValue([]);

    const res = await request(app).get(`/palettes/${PAL_ID_1}/related`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('sets a Cache-Control header', async () => {
    mockGetRelatedPalettes.mockResolvedValue([SAMPLE_PALETTE]);

    const res = await request(app).get(`/palettes/${PAL_ID_1}/related`);

    expect(res.headers['cache-control']).toContain('max-age=30');
  });
});

// ---------------------------------------------------------------------------
// Issue #113 – trending sort
// ---------------------------------------------------------------------------

describe('GET /palettes (sort=trending)', () => {
  beforeEach(() => {
    mockBrowsePalettes.mockReset();
  });

  it('passes sort=trending to browsePalettes', async () => {
    mockBrowsePalettes.mockResolvedValue([SAMPLE_PALETTE]);

    const res = await request(app).get('/palettes?sort=trending');

    expect(res.status).toBe(200);
    expect(mockBrowsePalettes).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'trending' })
    );
  });
});

// ---------------------------------------------------------------------------
// Issue #114 – UUID validation
// ---------------------------------------------------------------------------

describe('UUID validation on /:id routes', () => {
  beforeEach(() => {
    mockGetRelatedPalettes.mockReset();
    mockGetPaletteById.mockReset();
  });

  it('rejects a non-UUID palette id on GET /palettes/:id/related', async () => {
    const res = await request(app).get('/palettes/not-a-uuid/related');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid palette id/i);
  });

  it('rejects a non-UUID palette id on GET /palettes/:id', async () => {
    const res = await request(app).get('/palettes/bad-id');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid palette id/i);
  });

  it('accepts a well-formed UUID on GET /palettes/:id/related', async () => {
    mockGetRelatedPalettes.mockResolvedValue([]);
    const res = await request(app).get(`/palettes/${PAL_ID_1}/related`);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Issue #114 – browse safe fallback
// ---------------------------------------------------------------------------

describe('GET /palettes (safe fallback on DB error)', () => {
  beforeEach(() => {
    mockBrowsePalettes.mockReset();
  });

  it('returns empty data and X-Degraded header when service throws', async () => {
    mockBrowsePalettes.mockRejectedValue(new Error('DB unavailable'));

    const res = await request(app).get('/palettes');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.headers['x-degraded']).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Issue #117 – Theme-aware queries
// ---------------------------------------------------------------------------

describe('GET /palettes/themes', () => {
  it('returns the list of available themes', async () => {
    const res = await request(app).get('/palettes/themes');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('each theme has slug, label, description, and tagSlugs', async () => {
    const res = await request(app).get('/palettes/themes');

    expect(res.status).toBe(200);
    for (const theme of res.body.data) {
      expect(typeof theme.slug).toBe('string');
      expect(typeof theme.label).toBe('string');
      expect(typeof theme.description).toBe('string');
      expect(Array.isArray(theme.tagSlugs)).toBe(true);
      expect(theme.tagSlugs.length).toBeGreaterThan(0);
    }
  });

  it('sets a long-lived Cache-Control header', async () => {
    const res = await request(app).get('/palettes/themes');

    expect(res.headers['cache-control']).toContain('max-age=300');
  });
});

describe('GET /palettes (theme filter)', () => {
  beforeEach(() => {
    mockBrowsePalettes.mockReset();
  });

  it('expands ?theme=warm to the warm tagSlugs', async () => {
    mockBrowsePalettes.mockResolvedValue([SAMPLE_PALETTE]);

    const res = await request(app).get('/palettes?theme=warm');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const callArg = (
      mockBrowsePalettes.mock.calls[0] as unknown as [{ tags?: string[] }]
    )[0];
    expect(Array.isArray(callArg.tags)).toBe(true);
    expect(callArg.tags).toContain('warm');
  });

  it('expands ?theme=vibrant to the vibrant tagSlugs', async () => {
    mockBrowsePalettes.mockResolvedValue([]);

    await request(app).get('/palettes?theme=vibrant');

    const callArg = (
      mockBrowsePalettes.mock.calls[0] as unknown as [{ tags?: string[] }]
    )[0];
    expect(callArg.tags).toContain('vibrant');
  });

  it('merges ?theme= tags with explicit ?tags= slugs', async () => {
    mockBrowsePalettes.mockResolvedValue([]);

    await request(app).get('/palettes?theme=warm&tags=nature');

    const callArg = (
      mockBrowsePalettes.mock.calls[0] as unknown as [{ tags?: string[] }]
    )[0];
    expect(callArg.tags).toContain('warm');
    expect(callArg.tags).toContain('nature');
  });

  it('returns 400 for an unknown theme slug', async () => {
    const res = await request(app).get('/palettes?theme=nonexistent-theme');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unknown theme/i);
  });
});
