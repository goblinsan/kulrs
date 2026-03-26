import { Router, Response, Request } from 'express';
import {
  generateFromBaseColor,
  generateFromBaseColors,
  generateFromMood,
  generateFromImage,
  generateRelatedColors,
  generatePaletteSuggestions,
  generateImagePaletteSuggestions,
  OKLCHColor,
} from '@kulrs/shared';
import {
  generateFromBaseColorSchema,
  generateFromMoodSchema,
  generateFromImageSchema,
  relatedColorsSchema,
  paletteSuggestionsSchema,
  imageSuggestionsSchema,
} from '../utils/validation.js';
import {
  BadRequestError,
  ValidationError,
  asyncHandler,
} from '../utils/errors.js';

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
 * POST /generate/color/related
 * Return harmonic color relationships (complementary, analogous, triadic, etc.)
 * for a given source color (Issue #101)
 */
router.post(
  '/color/related',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validation = relatedColorsSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const { color } = validation.data;
    const related = generateRelatedColors(color as OKLCHColor);

    res.status(200).json({ success: true, data: related });
  })
);

/**
 * POST /generate/color/suggestions
 * Return ranked palette suggestions derived from a source color using
 * multiple harmony strategies (Issue #102)
 */
router.post(
  '/color/suggestions',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validation = paletteSuggestionsSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const { color, colorCount, count } = validation.data;
    const suggestions = generatePaletteSuggestions(
      color as OKLCHColor,
      colorCount,
      count
    );

    res.status(200).json({ success: true, data: suggestions });
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

/**
 * POST /generate/image/suggestions
 * Generate ranked palette suggestions from multiple extracted image colors.
 * Accepts up to 5 OKLCH colors (typically the dominant colors extracted from
 * an image) and returns scored/ranked suggestions across several harmony
 * strategies (Issue #118).
 */
router.post(
  '/image/suggestions',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validation = imageSuggestionsSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', validation.error.errors);
    }

    const { colors, colorCount, count } = validation.data;
    const suggestions = generateImagePaletteSuggestions(
      colors as OKLCHColor[],
      colorCount,
      count
    );

    res.status(200).json({ success: true, data: suggestions });
  })
);

export default router;
