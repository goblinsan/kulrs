import { OKLCHColor } from './types.js';
import { AssignedColor } from './contrast.js';
import {
  generateComplementary,
  generateAnalogous,
  generateTriadic,
  generateSplitComplementary,
} from './harmony.js';
import {
  generateFromBaseColors,
  generateFromBaseColor,
  GeneratedPalette,
} from './palette-generator.js';
import { generateContrastReport } from './contrast.js';

/**
 * A single ranked palette suggestion derived from a source color
 */
export interface PaletteSuggestion {
  /** 1-based rank (1 = best) */
  rank: number;
  /** Harmony strategy used to build this palette */
  harmony: string;
  /** Quality score in the range 0–1 (higher is better) */
  score: number;
  /** Descriptive tags summarising the palette character */
  tags: string[];
  /** The generated palette */
  palette: GeneratedPalette;
}

// ---------------------------------------------------------------------------
// Scoring constants
// ---------------------------------------------------------------------------

/** Maximum meaningful angular spread between any two hues (degrees) */
const MAX_HUE_SPREAD = 180;

/** Weight given to WCAG-AA accessibility when computing a palette score */
const ACCESSIBILITY_WEIGHT = 0.6;

/** Weight given to hue variety when computing a palette score */
const VARIETY_WEIGHT = 0.4;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the maximum angular spread across a set of hues (0–360).
 * Returns a value in [0, MAX_HUE_SPREAD].
 */
function maxHueSpread(hues: number[]): number {
  if (hues.length <= 1) return 0;
  let max = 0;
  for (let i = 0; i < hues.length; i++) {
    for (let j = i + 1; j < hues.length; j++) {
      const diff = Math.abs(hues[i] - hues[j]);
      const circular = Math.min(diff, 360 - diff);
      if (circular > max) max = circular;
    }
  }
  return max;
}

/**
 * Compute a quality score for a generated palette in [0, 1].
 *
 * Combines:
 *   - Accessibility (fraction of text/bg pairs that pass WCAG AA)
 *   - Variety      (normalised maximum hue spread)
 */
function scorePalette(palette: GeneratedPalette): number {
  const report = generateContrastReport(palette.colors);

  const accessibilityScore =
    report.summary.totalPairs > 0
      ? report.summary.passingAA / report.summary.totalPairs
      : 0;

  const hues = palette.colors.map((c: AssignedColor) => c.color.h);
  const varietyScore = Math.min(maxHueSpread(hues) / MAX_HUE_SPREAD, 1);

  return ACCESSIBILITY_WEIGHT * accessibilityScore + VARIETY_WEIGHT * varietyScore;
}

/**
 * Derive contextual tags from the source color and the generated palette.
 */
function deriveColorTags(source: OKLCHColor, palette: GeneratedPalette): string[] {
  const tags: string[] = [];

  // Temperature
  if (source.h >= 330 || source.h < 90) {
    tags.push('warm');
  } else if (source.h >= 150 && source.h < 270) {
    tags.push('cool');
  } else {
    tags.push('neutral-tone');
  }

  // Lightness
  if (source.l > 0.7) tags.push('light');
  else if (source.l < 0.3) tags.push('dark');

  // Saturation
  if (source.c > 0.25) tags.push('vibrant');
  else if (source.c < 0.1) tags.push('muted');

  // Accessibility badge
  const report = generateContrastReport(palette.colors);
  if (
    report.summary.totalPairs > 0 &&
    report.summary.passingAA / report.summary.totalPairs >= 0.5
  ) {
    tags.push('accessible');
  }

  return tags;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate multiple ranked palette suggestions from a single source color.
 *
 * Each suggestion applies a different harmony strategy and is scored by
 * accessibility + color variety.  The results are sorted best-first.
 *
 * @param source     - Base OKLCH color
 * @param colorCount - Number of main colors per palette (2–5, default 5)
 * @param count      - Number of suggestions to return (1–4, default 4)
 * @returns Array of palette suggestions sorted by score descending
 */
export function generatePaletteSuggestions(
  source: OKLCHColor,
  colorCount: number = 5,
  count: number = 4
): PaletteSuggestion[] {
  const clampedCount = Math.max(1, Math.min(4, count));

  /** Each strategy defines a harmony and the colors it seeds the generator with */
  const strategies: Array<{
    harmony: string;
    baseColors: () => OKLCHColor[];
    tags: string[];
  }> = [
    {
      harmony: 'complementary',
      baseColors: () => [source, generateComplementary(source)],
      tags: ['complementary', 'high-contrast', 'bold'],
    },
    {
      harmony: 'analogous',
      baseColors: () => [source, ...generateAnalogous(source, 30, 2)],
      tags: ['analogous', 'harmonious', 'cohesive'],
    },
    {
      harmony: 'triadic',
      baseColors: () => [source, ...generateTriadic(source)],
      tags: ['triadic', 'balanced', 'vibrant'],
    },
    {
      harmony: 'split-complementary',
      baseColors: () => [source, ...generateSplitComplementary(source, 30)],
      tags: ['split-complementary', 'nuanced', 'versatile'],
    },
  ];

  const suggestions: PaletteSuggestion[] = strategies
    .slice(0, clampedCount)
    .map((strategy, index) => {
      const colors = strategy.baseColors();
      const palette =
        colors.length === 1
          ? generateFromBaseColor(colors[0], colorCount)
          : generateFromBaseColors(colors, colorCount);

      const score = scorePalette(palette);
      const contextTags = deriveColorTags(source, palette);

      return {
        harmony: strategy.harmony,
        rank: index + 1, // will be re-assigned after sorting
        score,
        tags: [...strategy.tags, ...contextTags],
        palette,
      };
    });

  // Sort best-first and assign final ranks
  suggestions.sort((a, b) => b.score - a.score);
  suggestions.forEach((s, i) => {
    s.rank = i + 1;
  });

  return suggestions;
}
