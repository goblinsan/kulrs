import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { paletteService } from '../services/palette.service.js';
import { createPaletteSchema, ensureTagsSchema, isValidUUID } from '../utils/validation.js';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  asyncHandler,
} from '../utils/errors.js';
import { listThemes, getThemeBySlug } from '@kulrs/shared';

const router = Router();

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Clamp a numeric query param to [min, max]. */
function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const n = parseInt(raw ?? String(fallback), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/** Validate a deviceId string or throw. */
function validateDeviceId(deviceId: unknown): asserts deviceId is string {
  if (
    typeof deviceId !== 'string' ||
    deviceId.length > 128 ||
    !/^[\w-]+$/.test(deviceId)
  ) {
    throw new BadRequestError('Invalid deviceId format');
  }
}

/** Require an authenticated user or throw 401. */
function requireAuth(
  req: AuthenticatedRequest
): NonNullable<AuthenticatedRequest['user']> {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

/**
 * Validate that `id` is a well-formed UUID.
 * Rejects obviously-invalid IDs with 400 before they reach the database.
 */
function requireValidPaletteId(id: string): void {
  if (!isValidUUID(id)) {
    throw new BadRequestError('Invalid palette id format');
  }
}

/** Stricter write limiter for like/unlike/create/delete — 20 req/min/IP */
const paletteWriteLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Please try again later' },
});

/**
 * GET /palettes
 * Browse public palettes with filtering and sorting.
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const rawQuery = req.query as Record<string, string | undefined>;

    const sort =
      rawQuery.sort === 'popular'
        ? ('popular' as const)
        : rawQuery.sort === 'trending'
          ? ('trending' as const)
          : ('recent' as const);
    const limit = clampInt(rawQuery.limit, 20, 1, 50);
    const offset = clampInt(rawQuery.offset, 0, 0, 10_000);
    const userId = rawQuery.userId;
    const deviceId = rawQuery.deviceId;

    // Tag filter: ?tags=warm,vibrant  (comma-separated slugs)
    // Normalise to lowercase so clients can pass mixed-case slugs (e.g. "Warm")
    // and still match the slug values stored in the database.
    const tags = rawQuery.tags
      ? rawQuery.tags
          .split(',')
          .map(t => t.trim().toLowerCase())
          .filter(Boolean)
      : undefined;

    // Theme filter: ?theme=minimalist  (single theme slug, expands to tag slugs)
    // A theme is a higher-level style concept that maps to one or more tag slugs.
    // The resolved tag slugs are merged with any explicitly-provided ?tags= slugs.
    let resolvedTags = tags;
    if (rawQuery.theme) {
      const themeSlug = rawQuery.theme.trim().toLowerCase();
      const theme = getThemeBySlug(themeSlug);
      if (!theme) {
        throw new BadRequestError(`Unknown theme: ${themeSlug}`);
      }
      const themeTagSlugs = theme.tagSlugs;
      // Merge with explicit tags if both are provided, deduplicating
      if (resolvedTags && resolvedTags.length > 0) {
        resolvedTags = [...new Set([...resolvedTags, ...themeTagSlugs])];
      } else {
        resolvedTags = themeTagSlugs;
      }
    }

    // Text search: ?q=keyword  (max 100 chars)
    const q =
      rawQuery.q && rawQuery.q.trim().length > 0
        ? rawQuery.q.trim().slice(0, 100)
        : undefined;

    if (deviceId) validateDeviceId(deviceId);

    // Resolve viewer identity for per-palette like status
    let viewerUserId: string | null = null;
    if (req.user) {
      const viewer = await paletteService.getOrCreateUser(
        req.user.uid,
        req.user.email
      );
      viewerUserId = viewer.id;
    } else if (deviceId) {
      try {
        const anonUser =
          await paletteService.getOrCreateAnonymousUser(deviceId);
        viewerUserId = anonUser.id;
      } catch {
        // Ignore — viewer just won't see like status
      }
    }

    const palettes = await paletteService
      .browsePalettes({
        sort,
        userId,
        limit,
        offset,
        viewerUserId,
        tags: resolvedTags,
        q,
      })
      .catch(() => {
        // Safe fallback: if the DB is temporarily unavailable, return an empty
        // list rather than a 500 so clients degrade gracefully.
        res.setHeader('X-Degraded', 'true');
        return [] as Awaited<ReturnType<typeof paletteService.browsePalettes>>;
      });

    res.setHeader(
      'Cache-Control',
      'public, max-age=15, stale-while-revalidate=30'
    );
    res.status(200).json({ success: true, data: palettes });
  })
);

/**
 * GET /palettes/tags
 * List all available tags (for browse-by-mood/style UI).
 * Must be registered before /:id to prevent Express treating "tags" as an id.
 */
router.get(
  '/tags',
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const allTags = await paletteService.getAllTags();
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=600'
    );
    res.status(200).json({ success: true, data: allTags });
  })
);

router.post(
  '/tags/ensure',
  paletteWriteLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireAuth(req);
    const validation = ensureTagsSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const tags = await paletteService.ensureTags(validation.data);
    res.status(200).json({ success: true, data: tags });
  })
);

/**
 * GET /palettes/themes
 * List all available style themes (higher-level groupings of tag slugs).
 * Must be registered before /:id to prevent Express treating "themes" as an id.
 */
router.get(
  '/themes',
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const themes = listThemes();
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=600'
    );
    res.status(200).json({ success: true, data: themes });
  })
);

/**
 * GET /palettes/my
 * Get palettes created by the authenticated user
 */
router.get(
  '/my',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authUser = requireAuth(req);

    const { limit = '20', offset = '0' } = req.query as {
      limit?: string;
      offset?: string;
    };

    const user = await paletteService.getOrCreateUser(
      authUser.uid,
      authUser.email
    );

    const palettes = await paletteService.getUserPalettes(user.id, {
      limit: clampInt(limit, 20, 1, 50),
      offset: clampInt(offset, 0, 0, 10_000),
    });

    res.status(200).json({ success: true, data: palettes });
  })
);

/**
 * GET /palettes/:id
 * Get a palette by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const paletteId = String(req.params.id);
    requireValidPaletteId(paletteId);
    const palette = await paletteService.getPaletteById(paletteId);

    if (!palette) throw new NotFoundError('Palette not found');

    // Enforce privacy — allow owner or public palettes only
    let isOwner = false;
    if (req.user) {
      const viewer = await paletteService.getOrCreateUser(
        req.user.uid,
        req.user.email
      );
      isOwner = viewer.id === palette.userId;
    }

    if (!palette.isPublic && !isOwner) {
      throw new NotFoundError('Palette not found');
    }

    res.status(200).json({ success: true, data: { ...palette, isOwner } });
  })
);

/**
 * PUT /palettes/:id
 * Update the colors of a palette owned by the authenticated user.
 */
router.put(
  '/:id',
  paletteWriteLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authUser = requireAuth(req);
    const paletteId = String(req.params.id);
    requireValidPaletteId(paletteId);
    const user = await paletteService.getOrCreateUser(
      authUser.uid,
      authUser.email
    );

    const { colors: newColors } = req.body as {
      colors?: Array<{ hexValue: string; position: number; name: string }>;
    };

    if (
      !Array.isArray(newColors) ||
      newColors.length === 0 ||
      newColors.some(
        c =>
          typeof c.hexValue !== 'string' ||
          typeof c.position !== 'number' ||
          typeof c.name !== 'string'
      )
    ) {
      throw new BadRequestError(
        'colors must be a non-empty array of {hexValue, position, name}'
      );
    }

    const result = await paletteService.updatePaletteColors(
      user.id,
      paletteId,
      newColors
    );
    res.status(200).json({ success: true, data: result });
  })
);

/**
 * POST /palettes
 * Create a new palette
 */
router.post(
  '/',
  paletteWriteLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { deviceId } = req.body as { deviceId?: string };

    let user;
    let isAnonymous = false;
    if (req.user) {
      user = await paletteService.getOrCreateUser(req.user.uid, req.user.email);
    } else if (deviceId) {
      validateDeviceId(deviceId);
      user = await paletteService.getOrCreateAnonymousUser(deviceId);
      isAnonymous = true;
    } else {
      throw new UnauthorizedError();
    }

    const validation = createPaletteSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    // Anonymous palettes are always private — prevents feed pollution
    const paletteInput = isAnonymous
      ? { ...validation.data, isPublic: false }
      : validation.data;

    const palette = await paletteService.createPalette(user.id, paletteInput);
    res.status(201).json({ success: true, data: palette });
  })
);

/**
 * POST /palettes/:id/save
 * Save a palette to user's saved collection
 */
router.post(
  '/:id/save',
  paletteWriteLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authUser = requireAuth(req);
    const paletteId = String(req.params.id);
    requireValidPaletteId(paletteId);
    const user = await paletteService.getOrCreateUser(
      authUser.uid,
      authUser.email
    );
    const result = await paletteService.savePalette(user.id, paletteId);

    res.status(200).json({ success: true, data: result });
  })
);

/**
 * POST /palettes/:id/like
 * Like a palette — works for authenticated AND anonymous users.
 */
router.post(
  '/:id/like',
  paletteWriteLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const paletteId = String(req.params.id);
    requireValidPaletteId(paletteId);
    const { deviceId } = req.body as { deviceId?: string };

    let user;
    if (req.user) {
      user = await paletteService.getOrCreateUser(req.user.uid, req.user.email);
    } else if (deviceId) {
      validateDeviceId(deviceId);
      user = await paletteService.getOrCreateAnonymousUser(deviceId);
    } else {
      throw new BadRequestError('Must be logged in or provide a deviceId');
    }

    const result = await paletteService.likePalette(user.id, paletteId);
    res.status(200).json({ success: true, data: result });
  })
);

/**
 * DELETE /palettes/:id
 * Delete a palette owned by the authenticated user.
 * Cascade-deletes colors, likes, saves, and tags.
 */
router.delete(
  '/:id',
  paletteWriteLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authUser = requireAuth(req);
    const paletteId = String(req.params.id);
    requireValidPaletteId(paletteId);
    const user = await paletteService.getOrCreateUser(
      authUser.uid,
      authUser.email
    );

    // deletePalette throws NotFoundError if not found / not owned
    const result = await paletteService.deletePalette(user.id, paletteId);
    res.status(200).json({ success: true, data: result });
  })
);

/**
 * DELETE /palettes/:id/like
 * Unlike a palette — works for authenticated AND anonymous users.
 */
router.delete(
  '/:id/like',
  paletteWriteLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const paletteId = String(req.params.id);
    requireValidPaletteId(paletteId);
    const { deviceId } = req.body as { deviceId?: string };

    let user;
    if (req.user) {
      user = await paletteService.getOrCreateUser(req.user.uid, req.user.email);
    } else if (deviceId) {
      validateDeviceId(deviceId);
      user = await paletteService.getOrCreateAnonymousUser(deviceId);
    } else {
      throw new BadRequestError('Must be logged in or provide a deviceId');
    }

    const result = await paletteService.unlikePalette(user.id, paletteId);
    res.status(200).json({ success: true, data: result });
  })
);

/**
 * GET /palettes/:id/likes
 * Get like count and user's like status for a palette.
 */
router.get(
  '/:id/likes',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const paletteId = String(req.params.id);
    requireValidPaletteId(paletteId);
    const { deviceId } = req.query as { deviceId?: string };

    let userId: string | null = null;
    if (req.user) {
      const user = await paletteService.getOrCreateUser(
        req.user.uid,
        req.user.email
      );
      userId = user.id;
    } else if (deviceId) {
      const anonUser = await paletteService.getOrCreateAnonymousUser(deviceId);
      userId = anonUser.id;
    }

    const result = await paletteService.getLikeInfo(paletteId, userId);
    res.status(200).json({ success: true, data: result });
  })
);

/**
 * GET /palettes/:id/related
 * Find public palettes related to the given palette via shared tags.
 */
router.get(
  '/:id/related',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const paletteId = String(req.params.id);
    requireValidPaletteId(paletteId);
    const limit = clampInt(req.query.limit as string | undefined, 6, 1, 20);

    let viewerUserId: string | null = null;
    if (req.user) {
      const viewer = await paletteService.getOrCreateUser(
        req.user.uid,
        req.user.email
      );
      viewerUserId = viewer.id;
    }

    const related = await paletteService.getRelatedPalettes(paletteId, {
      limit,
      viewerUserId,
    });

    res.setHeader(
      'Cache-Control',
      'public, max-age=30, stale-while-revalidate=60'
    );
    res.status(200).json({ success: true, data: related });
  })
);

/**
 * POST /palettes/:id/remix
 * Remix a palette (create a copy)
 */
router.post(
  '/:id/remix',
  paletteWriteLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authUser = requireAuth(req);
    const paletteId = String(req.params.id);
    requireValidPaletteId(paletteId);
    const user = await paletteService.getOrCreateUser(
      authUser.uid,
      authUser.email
    );

    // remixPalette throws NotFoundError if palette doesn't exist
    const newPalette = await paletteService.remixPalette(user.id, paletteId);
    res.status(201).json({ success: true, data: newPalette });
  })
);

export default router;
