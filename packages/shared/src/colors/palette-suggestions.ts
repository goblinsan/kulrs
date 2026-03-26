import { OKLCHColor } from './types.js';
import {
  AssignedColor,
  ColorRole,
  calculateContrastRatio,
  WCAGLevel,
  meetsWCAGLevel,
} from './contrast.js';
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
  /**
   * UI usability score in the range 0–1.
   * Measures how suitable the palette is for UI usage based on
   * text-on-background and primary-on-background contrast.  (Issue #109)
   */
  usabilityScore: number;
  /**
   * Whether this palette is viable for general UI usage.
   * True when usabilityScore >= 0.5.  (Issue #109)
   */
  uiViable: boolean;
  /**
   * Per-role semantic usage suggestions based on the actual color values.
   * Keys are ColorRole strings; values are human-readable interface guidance.  (Issue #110)
   */
  semanticRoles: Record<string, string>;
  /**
   * Human-readable explanation of why this palette received its rank.
   * Summarises WCAG compliance, text contrast, and harmony type.  (Issue #111)
   */
  rankingExplanation: string;
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

/** usabilityScore threshold above which a palette is considered UI-viable */
const UI_VIABLE_THRESHOLD = 0.5;

/**
 * Weight applied to usabilityScore when computing the accessibility-aware
 * composite ranking score (Issue #111).  The remainder is taken from score.
 * Exported so that callers can reproduce the composite ranking formula.
 */
export const RANKING_USABILITY_WEIGHT = 0.4;

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
// Issue #109 – Palette usability scoring
// ---------------------------------------------------------------------------

/**
 * Compute a UI usability score for a palette in [0, 1].
 *
 * Focuses on the contrast of key role pairs that matter most for interface use:
 *   - TEXT on BACKGROUND (critical, weight 3 — must pass WCAG AA normal 4.5:1)
 *   - PRIMARY on BACKGROUND (important, weight 1 — should pass WCAG AA large 3:1)
 *
 * Falls back to the general pairwise AA fraction when no BACKGROUND role exists.
 */
function computeUsabilityScore(palette: GeneratedPalette): number {
  const backgrounds = palette.colors.filter((c) => c.role === ColorRole.BACKGROUND);
  const textColors = palette.colors.filter((c) => c.role === ColorRole.TEXT);
  const primaryColors = palette.colors.filter((c) => c.role === ColorRole.PRIMARY);

  if (backgrounds.length === 0) {
    // No explicit background: fall back to general pairwise accessibility
    const report = generateContrastReport(palette.colors);
    return report.summary.totalPairs > 0
      ? report.summary.passingAA / report.summary.totalPairs
      : 0;
  }

  let score = 0;
  let weight = 0;

  // TEXT vs BACKGROUND — most critical for readability (weight 3)
  for (const text of textColors) {
    for (const bg of backgrounds) {
      const ratio = calculateContrastRatio(text.color, bg.color);
      score += meetsWCAGLevel(ratio, WCAGLevel.AA_NORMAL) ? 3 : 0;
      weight += 3;
    }
  }

  // PRIMARY vs BACKGROUND — important for interactive elements (weight 1)
  for (const primary of primaryColors) {
    for (const bg of backgrounds) {
      const ratio = calculateContrastRatio(primary.color, bg.color);
      score += meetsWCAGLevel(ratio, WCAGLevel.AA_LARGE) ? 1 : 0;
      weight += 1;
    }
  }

  return weight > 0 ? score / weight : 0;
}

// ---------------------------------------------------------------------------
// Issue #110 – Semantic color role suggestions
// ---------------------------------------------------------------------------

/**
 * Derive contextual interface-usage suggestions for each color role present
 * in the palette.  Suggestions are based on the actual OKLCH values and
 * contrast relationships, not just the generic role label.
 */
function suggestSemanticRoles(palette: GeneratedPalette): Record<string, string> {
  const suggestions: Record<string, string> = {};
  const backgrounds = palette.colors.filter((c) => c.role === ColorRole.BACKGROUND);

  for (const assigned of palette.colors) {
    const { role, color } = assigned;
    let suggestion: string;

    switch (role) {
      case ColorRole.BACKGROUND:
        suggestion =
          color.l > 0.85
            ? 'Light surface — ideal for page canvas, cards, and panel backgrounds'
            : color.l < 0.35
              ? 'Dark surface — ideal for dark-mode page canvas and elevation layers'
              : 'Mid-tone surface — suitable for section panels or secondary containers';
        break;

      case ColorRole.TEXT:
        if (backgrounds.length > 0) {
          const ratio = calculateContrastRatio(color, backgrounds[0].color);
          const passes = meetsWCAGLevel(ratio, WCAGLevel.AA_NORMAL);
          suggestion = passes
            ? `Body text — contrast ratio ${ratio.toFixed(1)}:1 (WCAG AA compliant)`
            : `Decorative text only — contrast ratio ${ratio.toFixed(1)}:1 (below WCAG AA 4.5:1)`;
        } else {
          suggestion = 'Text — use for readable content against a light or contrasting background';
        }
        break;

      case ColorRole.PRIMARY:
        suggestion =
          color.c > 0.2
            ? 'Primary action — suitable for CTAs, buttons, and key interactive elements'
            : 'Subdued primary — suitable for secondary navigation or muted interactive elements';
        break;

      case ColorRole.SECONDARY:
        suggestion =
          'Secondary action — suitable for alternative buttons, tabs, and supporting elements';
        break;

      case ColorRole.ACCENT:
        suggestion =
          'Accent highlight — use sparingly for badges, tags, focus rings, and calls-to-attention';
        break;

      case ColorRole.ERROR:
        suggestion =
          'Error / danger state — use for validation failures and destructive action warnings';
        break;

      case ColorRole.WARNING:
        suggestion = 'Warning state — use for caution indicators and non-critical alerts';
        break;

      case ColorRole.SUCCESS:
        suggestion =
          'Success / confirmation state — use for positive feedback and completed actions';
        break;

      case ColorRole.INFO:
        suggestion =
          'Informational label — use for neutral guidance and non-critical notifications';
        break;

      default:
        suggestion = 'Supplementary color — use as a decorative or supporting element';
    }

    suggestions[role] = suggestion;
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// Issue #111 – Accessibility-aware ranking explanation
// ---------------------------------------------------------------------------

/**
 * Build a human-readable explanation of why a palette received its rank.
 *
 * Summarises WCAG AA compliance across all pairs, text-on-background
 * contrast quality, and the harmony strategy used.
 */
function buildRankingExplanation(
  palette: GeneratedPalette,
  usabilityScore: number,
  harmony: string
): string {
  const report = generateContrastReport(palette.colors);
  const aaFraction =
    report.summary.totalPairs > 0
      ? report.summary.passingAA / report.summary.totalPairs
      : 0;

  const parts: string[] = [];

  // Overall WCAG AA compliance — differentiate strong from moderate compliance
  const aaPercent = Math.round(aaFraction * 100);
  if (aaFraction >= 0.8) {
    parts.push(`strong WCAG AA compliance — ${aaPercent}% of color pairs pass`);
  } else if (aaFraction >= 0.5) {
    parts.push(`moderate WCAG AA compliance — ${aaPercent}% of color pairs pass`);
  } else {
    parts.push(`limited WCAG AA compliance — only ${aaPercent}% of color pairs pass`);
  }

  // Text/background UI viability
  if (usabilityScore >= 0.8) {
    parts.push('excellent text-on-background contrast');
  } else if (usabilityScore >= 0.5) {
    parts.push('adequate text-on-background contrast');
  } else if (usabilityScore > 0) {
    parts.push('limited text-on-background contrast — decorative use recommended');
  } else {
    parts.push('insufficient text-on-background contrast — decorative use only');
  }

  // Harmony type
  parts.push(`${harmony} harmony`);

  return `Ranked by accessibility-aware scoring: ${parts.join('; ')}.`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate multiple ranked palette suggestions from a single source color.
 *
 * Each suggestion applies a different harmony strategy and is scored by
 * accessibility + color variety.  The results are sorted best-first using an
 * accessibility-aware composite score that promotes UI-safe combinations
 * (Issue #111).
 *
 * Each suggestion also includes:
 *   - `usabilityScore` / `uiViable` — UI viability based on key contrast pairs (Issue #109)
 *   - `semanticRoles`              — per-role interface usage guidance (Issue #110)
 *   - `rankingExplanation`         — human-readable reason for the rank (Issue #111)
 *
 * @param source     - Base OKLCH color
 * @param colorCount - Number of main colors per palette (2–5, default 5)
 * @param count      - Number of suggestions to return (1–4, default 4)
 * @returns Array of palette suggestions sorted by accessibility-aware score descending
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
      const usabilityScore = computeUsabilityScore(palette);
      const uiViable = usabilityScore >= UI_VIABLE_THRESHOLD;
      const semanticRoles = suggestSemanticRoles(palette);
      const rankingExplanation = buildRankingExplanation(palette, usabilityScore, strategy.harmony);

      return {
        harmony: strategy.harmony,
        rank: index + 1, // will be re-assigned after sorting
        score,
        tags: [...strategy.tags, ...contextTags],
        palette,
        usabilityScore,
        uiViable,
        semanticRoles,
        rankingExplanation,
      };
    });

  // Sort best-first using an accessibility-aware composite score (Issue #111).
  // Gives extra weight to usabilityScore so UI-safe combinations are promoted.
  const composite = (s: PaletteSuggestion): number =>
    s.score * (1 - RANKING_USABILITY_WEIGHT) + s.usabilityScore * RANKING_USABILITY_WEIGHT;

  suggestions.sort((a, b) => composite(b) - composite(a));
  suggestions.forEach((s, i) => {
    s.rank = i + 1;
  });

  return suggestions;
}
