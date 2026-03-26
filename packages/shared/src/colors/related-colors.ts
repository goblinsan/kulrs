import { OKLCHColor } from './types.js';
import {
  generateComplementary,
  generateAnalogous,
  generateTriadic,
  generateSplitComplementary,
  generateNeutrals,
} from './harmony.js';

/**
 * A named group of colors sharing a harmonic relationship with a source color
 */
export interface RelatedColorGroup {
  type:
    | 'complementary'
    | 'analogous'
    | 'triadic'
    | 'split-complementary'
    | 'neutral';
  label: string;
  description: string;
  colors: OKLCHColor[];
}

/**
 * All harmonic relationships derived from a single source color
 */
export interface RelatedColors {
  source: OKLCHColor;
  relationships: RelatedColorGroup[];
}

/**
 * Generate all harmonic color relationships for a given source color.
 *
 * Returns complementary, analogous, triadic, split-complementary, and neutral
 * variants derived from the source color using standard color-wheel theory.
 *
 * @param source - Base OKLCH color
 * @returns All related color groups keyed by relationship type
 */
export function generateRelatedColors(source: OKLCHColor): RelatedColors {
  return {
    source,
    relationships: [
      {
        type: 'complementary',
        label: 'Complementary',
        description:
          'Opposite on the color wheel – high contrast and visually vibrant',
        colors: [generateComplementary(source)],
      },
      {
        type: 'analogous',
        label: 'Analogous',
        description:
          'Adjacent hues on the color wheel – harmonious and cohesive',
        colors: generateAnalogous(source, 30, 4),
      },
      {
        type: 'triadic',
        label: 'Triadic',
        description:
          'Evenly spaced around the color wheel – balanced and vibrant',
        colors: generateTriadic(source),
      },
      {
        type: 'split-complementary',
        label: 'Split Complementary',
        description:
          'Two colors flanking the complement – nuanced contrast with less tension',
        colors: generateSplitComplementary(source, 30),
      },
      {
        type: 'neutral',
        label: 'Neutrals',
        description:
          'Low-saturation tones derived from the source hue for backgrounds and text',
        colors: generateNeutrals(source, 3),
      },
    ],
  };
}
