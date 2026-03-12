import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { paletteService } from '../services/palette.service.js';
import { createPaletteSchema } from '../utils/validation.js';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  asyncHandler,
} from '../utils/errors.js';

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
      rawQuery.sort === 'popular' ? ('popular' as const) : ('recent' as const);
    const limit = clampInt(rawQuery.limit, 20, 1, 50);
    const offset = clampInt(rawQuery.offset, 0, 0, 10_000);
    const userId = rawQuery.userId;
    const deviceId = rawQuery.deviceId;

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

    const palettes = await paletteService.browsePalettes({
      sort,
      userId,
      limit,
      offset,
      viewerUserId,
    });

    res.setHeader(
      'Cache-Control',
      'public, max-age=15, stale-while-revalidate=30'
    );
    res.status(200).json({ success: true, data: palettes });
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

    const palette = await paletteService.createPalette(
      user.id,
      paletteInput
    );
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
 * POST /palettes/:id/remix
 * Remix a palette (create a copy)
 */
router.post(
  '/:id/remix',
  paletteWriteLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authUser = requireAuth(req);
    const paletteId = String(req.params.id);
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
