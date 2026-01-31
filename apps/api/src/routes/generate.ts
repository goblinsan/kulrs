import { Router, Response, Request } from 'express';
import {
  generateFromBaseColor,
  generateFromBaseColors,
  generateFromMood,
  generateFromImage,
  OKLCHColor,
} from '@kulrs/shared';
import {
  generateFromBaseColorSchema,
  generateFromMoodSchema,
  generateFromImageSchema,
} from '../utils/validation.js';

const router = Router();

/**
 * POST /generate/color
 * Generate palette from a base color
 */
router.post('/color', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validation = generateFromBaseColorSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const { color, colors, colorCount } = validation.data;

    // Generate palette - support both single color and array
    let palette;
    if (colors && colors.length > 0) {
      palette = generateFromBaseColors(colors as OKLCHColor[], colorCount);
    } else if (color) {
      palette = generateFromBaseColor(color as OKLCHColor, colorCount);
    } else {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Either color or colors must be provided',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: palette,
    });
  } catch (error) {
    console.error('Error generating palette from base color:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate palette from base color',
    });
  }
});

/**
 * POST /generate/mood
 * Generate palette from mood text (seeded/repeatable)
 */
router.post('/mood', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validation = generateFromMoodSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const { mood, seed, colorCount } = validation.data;

    // Generate palette with specified color count
    const palette = generateFromMood(mood, seed, colorCount);

    res.status(200).json({
      success: true,
      data: palette,
    });
  } catch (error) {
    console.error('Error generating palette from mood:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate palette from mood',
    });
  }
});

/**
 * POST /generate/image
 * Generate palette from image pixel data
 */
router.post('/image', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validation = generateFromImageSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const { pixels, colorCount } = validation.data;

    // Generate palette with specified color count
    const palette = generateFromImage(pixels, colorCount);

    res.status(200).json({
      success: true,
      data: palette,
    });
  } catch (error) {
    console.error('Error generating palette from image:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate palette from image',
    });
  }
});

export default router;
