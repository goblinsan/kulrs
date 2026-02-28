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
import { BadRequestError, ValidationError, asyncHandler } from '../utils/errors.js';

const router = Router();

/**
 * POST /generate/color
 * Generate palette from a base color
 */
router.post(
  '/color',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validation = generateFromBaseColorSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const { color, colors, colorCount } = validation.data;

    let palette;
    if (colors && colors.length > 0) {
      palette = generateFromBaseColors(colors as OKLCHColor[], colorCount);
    } else if (color) {
      palette = generateFromBaseColor(color as OKLCHColor, colorCount);
    } else {
      throw new BadRequestError('Either color or colors must be provided');
    }

    res.status(200).json({ success: true, data: palette });
  })
);

/**
 * POST /generate/mood
 * Generate palette from mood text (seeded/repeatable)
 */
router.post(
  '/mood',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validation = generateFromMoodSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const { mood, seed, colorCount } = validation.data;
    const palette = generateFromMood(mood, seed, colorCount);

    res.status(200).json({ success: true, data: palette });
  })
);

/**
 * POST /generate/image
 * Generate palette from image pixel data
 */
router.post(
  '/image',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validation = generateFromImageSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const { pixels, colorCount } = validation.data;
    const palette = generateFromImage(pixels, colorCount);

    res.status(200).json({ success: true, data: palette });
  })
);

export default router;
