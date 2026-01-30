import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { paletteService } from '../services/palette.service.js';
import { createPaletteSchema } from '../utils/validation.js';

const router = Router();

/**
 * POST /palettes
 * Create a new palette
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
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

    // Get or create user
    const user = await paletteService.getOrCreateUser(
      req.user.uid,
      req.user.email
    );

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
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create palette',
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
 * Like a palette
 */
router.post('/:id/like', async (req: AuthenticatedRequest, res: Response) => {
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
 * Unlike a palette
 */
router.delete('/:id/like', async (req: AuthenticatedRequest, res: Response) => {
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
 * Get like count and user's like status for a palette
 */
router.get('/:id/likes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paletteId = String(req.params.id);

    // Get user if authenticated
    let userId: string | null = null;
    if (req.user) {
      const user = await paletteService.getOrCreateUser(
        req.user.uid,
        req.user.email
      );
      userId = user.id;
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
