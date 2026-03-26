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

const SAMPLE_PALETTE = {
  id: 'pal-1',
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
      { ...SAMPLE_PALETTE, id: 'pal-2', name: 'Nordic Frost' },
      { ...SAMPLE_PALETTE, id: 'pal-3', name: 'Forest Canopy' },
    ];
    mockGetRelatedPalettes.mockResolvedValue(related);

    const res = await request(app).get('/palettes/pal-1/related');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('forwards limit query param', async () => {
    mockGetRelatedPalettes.mockResolvedValue([]);

    const res = await request(app).get('/palettes/pal-1/related?limit=3');

    expect(res.status).toBe(200);
    expect(mockGetRelatedPalettes).toHaveBeenCalledWith(
      'pal-1',
      expect.objectContaining({ limit: 3 })
    );
  });

  it('clamps limit to max 20', async () => {
    mockGetRelatedPalettes.mockResolvedValue([]);

    const res = await request(app).get('/palettes/pal-1/related?limit=99');

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

    const res = await request(app).get('/palettes/pal-1/related');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('sets a Cache-Control header', async () => {
    mockGetRelatedPalettes.mockResolvedValue([SAMPLE_PALETTE]);

    const res = await request(app).get('/palettes/pal-1/related');

    expect(res.headers['cache-control']).toContain('max-age=30');
  });
});
