import { OKLCHColor, RGBColor } from './types.js';
import { oklchToRgb } from './oklch.js';

/**
 * Color roles in a palette
 */
export enum ColorRole {
  BACKGROUND = 'background',
  TEXT = 'text',
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  ACCENT = 'accent',
  ERROR = 'error',
  WARNING = 'warning',
  SUCCESS = 'success',
  INFO = 'info',
}

/**
 * Assigned color with role
 */
export interface AssignedColor {
  role: ColorRole;
  color: OKLCHColor;
}

/**
 * WCAG compliance levels
 */
export enum WCAGLevel {
  AA_NORMAL = 'AA-normal',
  AA_LARGE = 'AA-large',
  AAA_NORMAL = 'AAA-normal',
  AAA_LARGE = 'AAA-large',
}

/**
 * Contrast requirements for WCAG levels
 */
const WCAG_REQUIREMENTS = {
  [WCAGLevel.AA_NORMAL]: 4.5,
  [WCAGLevel.AA_LARGE]: 3.0,
  [WCAGLevel.AAA_NORMAL]: 7.0,
  [WCAGLevel.AAA_LARGE]: 4.5,
};

/**
 * Contrast check result
 */
export interface ContrastCheck {
  foreground: ColorRole;
  background: ColorRole;
  ratio: number;
  passes: {
    [WCAGLevel.AA_NORMAL]: boolean;
    [WCAGLevel.AA_LARGE]: boolean;
    [WCAGLevel.AAA_NORMAL]: boolean;
    [WCAGLevel.AAA_LARGE]: boolean;
  };
}

/**
 * Contrast report
 */
export interface ContrastReport {
  checks: ContrastCheck[];
  summary: {
    totalPairs: number;
    passingAA: number;
    passingAAA: number;
  };
}

/**
 * Calculates relative luminance of an RGB color
 * Following WCAG 2.0 formula
 */
function getRelativeLuminance(rgb: RGBColor): number {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates contrast ratio between two colors
 * @param color1 - First color (OKLCH)
 * @param color2 - Second color (OKLCH)
 * @returns Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1: OKLCHColor, color2: OKLCHColor): number {
  const rgb1 = oklchToRgb(color1);
  const rgb2 = oklchToRgb(color2);

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if a contrast ratio meets a specific WCAG level
 * @param ratio - Contrast ratio
 * @param level - WCAG level to check
 * @returns True if the ratio meets the level requirement
 */
export function meetsWCAGLevel(ratio: number, level: WCAGLevel): boolean {
  return ratio >= WCAG_REQUIREMENTS[level];
}

/**
 * Generates contrast check for a color pair
 * @param foreground - Foreground color with role
 * @param background - Background color with role
 * @returns Contrast check result
 */
export function checkContrast(
  foreground: AssignedColor,
  background: AssignedColor
): ContrastCheck {
  const ratio = calculateContrastRatio(foreground.color, background.color);

  return {
    foreground: foreground.role,
    background: background.role,
    ratio,
    passes: {
      [WCAGLevel.AA_NORMAL]: meetsWCAGLevel(ratio, WCAGLevel.AA_NORMAL),
      [WCAGLevel.AA_LARGE]: meetsWCAGLevel(ratio, WCAGLevel.AA_LARGE),
      [WCAGLevel.AAA_NORMAL]: meetsWCAGLevel(ratio, WCAGLevel.AAA_NORMAL),
      [WCAGLevel.AAA_LARGE]: meetsWCAGLevel(ratio, WCAGLevel.AAA_LARGE),
    },
  };
}

/**
 * Generates a full contrast report for a palette
 * @param palette - Array of assigned colors
 * @returns Contrast report with all checks
 */
export function generateContrastReport(palette: AssignedColor[]): ContrastReport {
  const checks: ContrastCheck[] = [];
  const backgrounds = palette.filter((c) => c.role === ColorRole.BACKGROUND);
  const foregrounds = palette.filter((c) => c.role !== ColorRole.BACKGROUND);

  // Check all foreground colors against all background colors
  for (const bg of backgrounds) {
    for (const fg of foregrounds) {
      checks.push(checkContrast(fg, bg));
    }
  }

  // If no dedicated backgrounds, check all pairs
  if (backgrounds.length === 0) {
    for (let i = 0; i < palette.length; i++) {
      for (let j = i + 1; j < palette.length; j++) {
        checks.push(checkContrast(palette[i], palette[j]));
      }
    }
  }

  const passingAA = checks.filter((c) => c.passes[WCAGLevel.AA_NORMAL]).length;
  const passingAAA = checks.filter((c) => c.passes[WCAGLevel.AAA_NORMAL]).length;

  return {
    checks,
    summary: {
      totalPairs: checks.length,
      passingAA,
      passingAAA,
    },
  };
}

/**
 * Assigns roles to a set of colors based on their characteristics
 * @param colors - Array of OKLCH colors
 * @returns Array of assigned colors with roles
 */
export function assignRoles(colors: OKLCHColor[]): AssignedColor[] {
  if (colors.length === 0) {
    return [];
  }

  const assigned: AssignedColor[] = [];
  const sortedByLightness = [...colors].sort((a, b) => a.l - b.l);
  
  // Assign background (lightest color)
  if (sortedByLightness.length > 0) {
    const lightest = sortedByLightness[sortedByLightness.length - 1];
    assigned.push({ role: ColorRole.BACKGROUND, color: lightest });
  }

  // Assign text (darkest color)
  if (sortedByLightness.length > 1) {
    const darkest = sortedByLightness[0];
    assigned.push({ role: ColorRole.TEXT, color: darkest });
  }

  // Assign primary (highest chroma color that's not too light or dark)
  const midRange = colors.filter((c) => c.l > 0.3 && c.l < 0.7);
  if (midRange.length > 0) {
    const highestChroma = midRange.reduce((prev, curr) =>
      curr.c > prev.c ? curr : prev
    );
    if (!assigned.find((a) => a.color === highestChroma)) {
      assigned.push({ role: ColorRole.PRIMARY, color: highestChroma });
    }
  }

  // Assign secondary (next highest chroma)
  const remaining = colors.filter((c) => !assigned.find((a) => a.color === c));
  if (remaining.length > 0) {
    const sortedByChroma = remaining.sort((a, b) => b.c - a.c);
    if (sortedByChroma.length > 0) {
      assigned.push({ role: ColorRole.SECONDARY, color: sortedByChroma[0] });
    }
  }

  // Assign accent (if there are more colors)
  const stillRemaining = colors.filter((c) => !assigned.find((a) => a.color === c));
  if (stillRemaining.length > 0) {
    assigned.push({ role: ColorRole.ACCENT, color: stillRemaining[0] });
  }

  // Assign any remaining colors as info/success/warning/error based on hue
  const unassigned = colors.filter((c) => !assigned.find((a) => a.color === c));
  unassigned.forEach((color, index) => {
    const hue = color.h;
    let role: ColorRole;

    if (hue >= 0 && hue < 60) {
      role = ColorRole.ERROR; // Red-orange
    } else if (hue >= 60 && hue < 150) {
      role = ColorRole.SUCCESS; // Yellow-green
    } else if (hue >= 150 && hue < 210) {
      role = ColorRole.INFO; // Cyan-blue
    } else if (hue >= 210 && hue < 270) {
      role = ColorRole.INFO; // Blue
    } else {
      role = ColorRole.WARNING; // Purple-red
    }

    assigned.push({ role, color });
  });

  return assigned;
}

/**
 * Finds colors in palette that meet minimum contrast with a given color
 * @param targetColor - The color to check contrast against
 * @param palette - Array of colors to search
 * @param minRatio - Minimum contrast ratio required
 * @returns Array of colors that meet the contrast requirement
 */
export function findAccessiblePairs(
  targetColor: OKLCHColor,
  palette: OKLCHColor[],
  minRatio: number = 4.5
): OKLCHColor[] {
  return palette.filter((color) => {
    const ratio = calculateContrastRatio(targetColor, color);
    return ratio >= minRatio;
  });
}
