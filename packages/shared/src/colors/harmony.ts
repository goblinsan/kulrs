import { OKLCHColor } from './types.js';

/**
 * Normalizes hue to 0-360 range
 */
function normalizeHue(hue: number): number {
  let normalized = hue % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

/**
 * Generates analogous colors (adjacent hues)
 * @param baseColor - Base OKLCH color
 * @param angle - Angle between colors (default 30 degrees)
 * @param count - Number of analogous colors to generate (default 2)
 * @returns Array of analogous colors
 */
export function generateAnalogous(
  baseColor: OKLCHColor,
  angle: number = 30,
  count: number = 2
): OKLCHColor[] {
  const colors: OKLCHColor[] = [];
  
  for (let i = 1; i <= count; i++) {
    // Generate colors on both sides
    if (i % 2 === 1) {
      // Positive angle
      const offset = Math.ceil(i / 2);
      colors.push({
        l: baseColor.l,
        c: baseColor.c,
        h: normalizeHue(baseColor.h + angle * offset),
      });
    } else {
      // Negative angle
      const offset = Math.ceil(i / 2);
      colors.push({
        l: baseColor.l,
        c: baseColor.c,
        h: normalizeHue(baseColor.h - angle * offset),
      });
    }
  }
  
  return colors;
}

/**
 * Generates complementary color (opposite hue)
 * @param baseColor - Base OKLCH color
 * @returns Complementary color
 */
export function generateComplementary(baseColor: OKLCHColor): OKLCHColor {
  return {
    l: baseColor.l,
    c: baseColor.c,
    h: normalizeHue(baseColor.h + 180),
  };
}

/**
 * Generates split-complementary colors
 * @param baseColor - Base OKLCH color
 * @param angle - Angle offset from complement (default 30 degrees)
 * @returns Array of two split-complementary colors
 */
export function generateSplitComplementary(
  baseColor: OKLCHColor,
  angle: number = 30
): OKLCHColor[] {
  const complementHue = normalizeHue(baseColor.h + 180);
  
  return [
    {
      l: baseColor.l,
      c: baseColor.c,
      h: normalizeHue(complementHue - angle),
    },
    {
      l: baseColor.l,
      c: baseColor.c,
      h: normalizeHue(complementHue + angle),
    },
  ];
}

/**
 * Generates triadic colors (evenly spaced around the color wheel)
 * @param baseColor - Base OKLCH color
 * @returns Array of two triadic colors (third one is the base)
 */
export function generateTriadic(baseColor: OKLCHColor): OKLCHColor[] {
  return [
    {
      l: baseColor.l,
      c: baseColor.c,
      h: normalizeHue(baseColor.h + 120),
    },
    {
      l: baseColor.l,
      c: baseColor.c,
      h: normalizeHue(baseColor.h + 240),
    },
  ];
}

/**
 * Generates neutral colors (low chroma variations)
 * @param baseColor - Base OKLCH color
 * @param count - Number of neutrals to generate (default 3)
 * @returns Array of neutral colors
 */
export function generateNeutrals(
  baseColor: OKLCHColor,
  count: number = 3
): OKLCHColor[] {
  const colors: OKLCHColor[] = [];
  const maxChroma = 0.05; // Very low chroma for neutrals
  
  // Generate neutrals with varying lightness
  for (let i = 0; i < count; i++) {
    const lightnessFactor = (i + 1) / (count + 1);
    colors.push({
      l: lightnessFactor,
      c: Math.min(baseColor.c * 0.2, maxChroma), // Reduce chroma significantly
      h: baseColor.h, // Keep same hue
    });
  }
  
  return colors;
}

/**
 * Removes duplicate colors from an array based on similarity threshold
 * @param colors - Array of OKLCH colors
 * @param threshold - Similarity threshold (default 0.01)
 * @returns Array of unique colors
 */
export function removeDuplicates(
  colors: OKLCHColor[],
  threshold: number = 0.01
): OKLCHColor[] {
  const unique: OKLCHColor[] = [];
  
  for (const color of colors) {
    const isDuplicate = unique.some((existing) => {
      const lDiff = Math.abs(existing.l - color.l);
      const cDiff = Math.abs(existing.c - color.c);
      const hDiff = Math.min(
        Math.abs(existing.h - color.h),
        360 - Math.abs(existing.h - color.h)
      );
      
      return lDiff < threshold && cDiff < threshold && hDiff < threshold * 360;
    });
    
    if (!isDuplicate) {
      unique.push(color);
    }
  }
  
  return unique;
}

/**
 * Validates that a color has sane chroma (not too high)
 * @param color - OKLCH color
 * @param maxChroma - Maximum allowed chroma (default 0.4)
 * @returns True if chroma is within bounds
 */
export function hasSaneChroma(
  color: OKLCHColor,
  maxChroma: number = 0.4
): boolean {
  return color.c >= 0 && color.c <= maxChroma;
}

/**
 * Filters colors to only include those with sane chroma
 * @param colors - Array of OKLCH colors
 * @param maxChroma - Maximum allowed chroma (default 0.4)
 * @returns Filtered array of colors
 */
export function filterSaneChroma(
  colors: OKLCHColor[],
  maxChroma: number = 0.4
): OKLCHColor[] {
  return colors.filter((color) => hasSaneChroma(color, maxChroma));
}

/**
 * Applies quality gates to a color palette
 * @param colors - Array of OKLCH colors
 * @param options - Quality gate options
 * @returns Processed array of colors
 */
export function applyQualityGates(
  colors: OKLCHColor[],
  options: {
    removeDuplicates?: boolean;
    maxChroma?: number;
    duplicateThreshold?: number;
  } = {}
): OKLCHColor[] {
  let result = [...colors];
  
  // Filter out colors with excessive chroma
  if (options.maxChroma !== undefined) {
    result = filterSaneChroma(result, options.maxChroma);
  }
  
  // Remove duplicates
  if (options.removeDuplicates !== false) {
    result = removeDuplicates(result, options.duplicateThreshold);
  }
  
  return result;
}
