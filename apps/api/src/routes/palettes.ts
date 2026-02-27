import { Router, Response, Request } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { paletteService } from '../services/palette.service.js';
import { createPaletteSchema } from '../utils/validation.js';

const router = Router();

/**
 * GET /palettes
 * Browse public palettes with filtering and sorting.
 * Accepts optional deviceId query param to include viewer's like status.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      sort = 'recent',
      userId,
      limit = '20',
      offset = '0',
      deviceId,
    } = req.query as {
      sort?: 'recent' | 'popular';
      userId?: string;
      limit?: string;
      offset?: string;
      deviceId?: string;
    };

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
      sort: sort as 'recent' | 'popular',
      userId,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      viewerUserId,
    });

    res.status(200).json({
      success: true,
      data: palettes,
    });
  } catch (error) {
    console.error('Error browsing palettes:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to browse palettes',
    });
  }
});

/**
 * GET /palettes/my
 * Get palettes created by the authenticated user
 */
router.get('/my', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { limit = '20', offset = '0' } = req.query as {
      limit?: string;
      offset?: string;
    };

    const user = await paletteService.getOrCreateUser(
      req.user.uid,
      req.user.email
    );

    const palettes = await paletteService.getUserPalettes(user.id, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.status(200).json({
      success: true,
      data: palettes,
    });
  } catch (error) {
    console.error('Error fetching user palettes:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch palettes',
    });
  }
});

/**
 * GET /palettes/:id
 * Get a palette by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const paletteId = String(req.params.id);

    const palette = await paletteService.getPaletteById(paletteId);

    if (!palette) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Palette not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: palette,
    });
  } catch (error) {
    console.error('Error getting palette:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get palette',
    });
  }
});

/**
 * POST /palettes
 * Create a new palette
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Resolve user — authenticated or anonymous via deviceId
    const { deviceId } = req.body as { deviceId?: string };
    let user;
    if (req.user) {
      user = await paletteService.getOrCreateUser(req.user.uid, req.user.email);
    } else if (deviceId) {
      user = await paletteService.getOrCreateAnonymousUser(deviceId);
    } else {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate request body
    const validation = createPaletteSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    // Create palette
    const palette = await paletteService.createPalette(
      user.id,
      validation.data
    );

    res.status(201).json({
      success: true,
      data: palette,
    });
  } catch (error) {
    console.error('Error creating palette:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create palette',
      details: process.env.NODE_ENV !== 'production' ? errorMessage : undefined,
    });
  }
});

/**
 * POST /palettes/:id/save
 * Save a palette to user's saved collection
 */
router.post('/:id/save', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const paletteId = String(req.params.id);

    // Get or create user
    const user = await paletteService.getOrCreateUser(
      req.user.uid,
      req.user.email
    );

    // Save palette
    const result = await paletteService.savePalette(user.id, paletteId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error saving palette:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save palette',
    });
  }
});

/**
 * POST /palettes/:id/like
 * Like a palette — works for authenticated AND anonymous users.
 * Anonymous users are identified by a deviceId in the request body.
 */
router.post('/:id/like', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paletteId = String(req.params.id);
    const { deviceId } = req.body as { deviceId?: string };

    let user;
    if (req.user) {
      user = await paletteService.getOrCreateUser(req.user.uid, req.user.email);
    } else if (deviceId) {
      user = await paletteService.getOrCreateAnonymousUser(deviceId);
    } else {
      res
        .status(400)
        .json({ error: 'Must be logged in or provide a deviceId' });
      return;
    }

    // Like palette
    const result = await paletteService.likePalette(user.id, paletteId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error liking palette:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to like palette',
    });
  }
});

/**
 * DELETE /palettes/:id/like
 * Unlike a palette — works for authenticated AND anonymous users.
 */
router.delete('/:id/like', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paletteId = String(req.params.id);
    const { deviceId } = req.body as { deviceId?: string };

    let user;
    if (req.user) {
      user = await paletteService.getOrCreateUser(req.user.uid, req.user.email);
    } else if (deviceId) {
      user = await paletteService.getOrCreateAnonymousUser(deviceId);
    } else {
      res
        .status(400)
        .json({ error: 'Must be logged in or provide a deviceId' });
      return;
    }

    // Unlike palette
    const result = await paletteService.unlikePalette(user.id, paletteId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error unliking palette:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to unlike palette',
    });
  }
});

/**
 * GET /palettes/:id/likes
 * Get like count and user's like status for a palette.
 * Supports anonymous users via ?deviceId= query param.
 */
router.get('/:id/likes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paletteId = String(req.params.id);
    const { deviceId } = req.query as { deviceId?: string };

    // Resolve user ID from auth token or deviceId
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

    // Get like info
    const result = await paletteService.getLikeInfo(paletteId, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting like info:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get like info',
    });
  }
});

/**
 * POST /palettes/:id/remix
 * Remix a palette (create a copy)
 */
router.post('/:id/remix', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const paletteId = String(req.params.id);

    // Get or create user
    const user = await paletteService.getOrCreateUser(
      req.user.uid,
      req.user.email
    );

    // Remix palette
    try {
      const newPalette = await paletteService.remixPalette(user.id, paletteId);

      res.status(201).json({
        success: true,
        data: newPalette,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Palette not found') {
        res.status(404).json({
          error: 'Not Found',
          message: 'Palette not found',
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error remixing palette:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remix palette',
    });
  }
});

export default router;
