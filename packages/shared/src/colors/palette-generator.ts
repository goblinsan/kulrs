import { OKLCHColor } from './types.js';
import {
  generateAnalogous,
  generateComplementary,
  generateSplitComplementary,
  generateTriadic,
  generateNeutrals,
  applyQualityGates,
} from './harmony.js';
import { assignRoles, AssignedColor, ColorRole } from './contrast.js';
import { rgbToOklch } from './oklch.js';

/**
 * Color role metadata
 */
export interface ColorMetadata {
  role: string;
  description: string;
}

/**
 * Generated palette with metadata
 */
export interface GeneratedPalette {
  colors: AssignedColor[];
  metadata: {
    generator: string;
    explanation: string;
    timestamp: string;
  };
}

/**
 * Generate palette from base color
 * Returns 8-12 colors with roles and explanation metadata
 * 
 * @param baseColor - Base OKLCH color to generate palette from
 * @returns Generated palette with colors and metadata
 */
export function generateFromBaseColor(baseColor: OKLCHColor): GeneratedPalette {
  const colors: OKLCHColor[] = [];
  
  // Add base color
  colors.push(baseColor);
  
  // Generate complementary color
  const complement = generateComplementary(baseColor);
  colors.push(complement);
  
  // Generate analogous colors (2)
  const analogous = generateAnalogous(baseColor, 30, 2);
  colors.push(...analogous);
  
  // Generate split-complementary colors (2)
  const splitComp = generateSplitComplementary(baseColor, 30);
  colors.push(...splitComp);
  
  // Generate neutral colors (3-5)
  const neutrals = generateNeutrals(baseColor, 4);
  colors.push(...neutrals);
  
  // Apply quality gates to filter out duplicates and excessive chroma
  const filtered = applyQualityGates(colors, {
    maxChroma: 0.4,
    removeDuplicates: true,
    duplicateThreshold: 0.02,
  });
  
  // Ensure we have 8-12 colors
  let finalColors = filtered;
  if (filtered.length < 8) {
    // Add more analogous colors if needed
    const extraAnalogous = generateAnalogous(baseColor, 20, 4);
    finalColors = applyQualityGates([...filtered, ...extraAnalogous], {
      maxChroma: 0.4,
      removeDuplicates: true,
      duplicateThreshold: 0.02,
    });
  }
  
  // Take up to 12 colors
  if (finalColors.length > 12) {
    finalColors = finalColors.slice(0, 12);
  }
  
  // Assign roles to colors
  const assignedColors = assignRoles(finalColors);
  
  return {
    colors: assignedColors,
    metadata: {
      generator: 'color',
      explanation: `Generated palette from base color with ${assignedColors.length} harmonious colors using complementary, analogous, and neutral strategies.`,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Generate palette from multiple base colors
 * Returns 8-12 colors harmonizing across all provided base colors
 * The input base colors are preserved exactly as-is in their original order
 * Background and text colors are derived from the base colors for good contrast
 * 
 * @param baseColors - Array of OKLCH colors (1-5 colors)
 * @returns Generated palette with colors and metadata
 */
export function generateFromBaseColors(baseColors: OKLCHColor[]): GeneratedPalette {
  if (baseColors.length === 0) {
    throw new Error('At least one base color is required');
  }
  
  // If only one color, use the single-color generator
  if (baseColors.length === 1) {
    return generateFromBaseColor(baseColors[0]);
  }
  
  // Preserve the user's base colors exactly as-is
  const preservedColors: OKLCHColor[] = [...baseColors];
  
  // Derive background and text colors from the base colors
  // Background: very light version of the first color (or white-ish with hint of hue)
  const baseForDerivation = baseColors[0];
  const derivedBackground: OKLCHColor = {
    l: 0.97, // Very light
    c: Math.min(baseForDerivation.c * 0.1, 0.02), // Very low chroma
    h: baseForDerivation.h, // Same hue family
  };
  
  // Text: very dark version of the first color (or near-black with hint of hue)
  const derivedText: OKLCHColor = {
    l: 0.1, // Very dark
    c: Math.min(baseForDerivation.c * 0.15, 0.03), // Very low chroma
    h: baseForDerivation.h, // Same hue family
  };
  
  // Generate additional harmonious colors (not including bg/text - those are derived)
  const additionalColors: OKLCHColor[] = [];
  
  // For each base color, generate some harmonious variations
  for (const baseColor of baseColors) {
    // Add analogous colors for each base (1 per base)
    const analogous = generateAnalogous(baseColor, 25, 1);
    additionalColors.push(...analogous);
  }
  
  // Apply quality gates ONLY to additional colors (not the user's input)
  let filteredAdditional = applyQualityGates(additionalColors, {
    maxChroma: 0.4,
    removeDuplicates: true,
    duplicateThreshold: 0.02,
  });
  
  // Also filter out any additional colors that are too similar to preserved colors
  filteredAdditional = filteredAdditional.filter(additional => {
    return !preservedColors.some(preserved => {
      const hDiff = Math.abs(preserved.h - additional.h);
      const normalizedHDiff = Math.min(hDiff, 360 - hDiff) / 360;
      const lDiff = Math.abs(preserved.l - additional.l);
      const cDiff = Math.abs(preserved.c - additional.c);
      const distance = Math.sqrt(normalizedHDiff ** 2 + lDiff ** 2 + cDiff ** 2);
      return distance < 0.05; // Too similar to a preserved color
    });
  });
  
  // Build final color list:
  // 1. User's base colors (preserved in order)
  // 2. Derived background and text
  // 3. Additional harmonious colors
  const assignedColors: AssignedColor[] = [];
  
  // Assign the preserved colors as PRIMARY, SECONDARY, ACCENT, etc.
  const baseRoles: ColorRole[] = [
    ColorRole.PRIMARY,
    ColorRole.SECONDARY,
    ColorRole.ACCENT,
    ColorRole.INFO,
    ColorRole.SUCCESS,
  ];
  
  for (let i = 0; i < preservedColors.length; i++) {
    assignedColors.push({
      role: baseRoles[i] || ColorRole.ACCENT,
      color: preservedColors[i],
    });
  }
  
  // Add derived background and text
  assignedColors.push({
    role: ColorRole.BACKGROUND,
    color: derivedBackground,
  });
  
  assignedColors.push({
    role: ColorRole.TEXT,
    color: derivedText,
  });
  
  // Add additional harmonious colors with remaining roles
  const remainingRoles: ColorRole[] = [ColorRole.WARNING, ColorRole.ERROR];
  for (let i = 0; i < filteredAdditional.length && i < remainingRoles.length; i++) {
    assignedColors.push({
      role: remainingRoles[i],
      color: filteredAdditional[i],
    });
  }
  
  return {
    colors: assignedColors,
    metadata: {
      generator: 'colors',
      explanation: `Generated palette from ${baseColors.length} base colors with derived background/text for good contrast.`,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Mood-based palette parameters
 */
interface MoodParameters {
  baseHue: number;
  chromaRange: [number, number];
  lightnessRange: [number, number];
  harmony: 'analogous' | 'complementary' | 'triadic' | 'split-complementary';
}

/**
 * Simple seeded pseudo-random number generator
 * Uses a linear congruential generator for deterministic results
 */
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  /**
   * Generate next random number between 0 and 1
   */
  next(): number {
    // Linear congruential generator parameters
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    
    this.seed = (a * this.seed + c) % m;
    return this.seed / m;
  }
  
  /**
   * Generate random number in range [min, max)
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  
  /**
   * Select random item from array
   */
  choice<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

/**
 * Hash string to number for seeding
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Map mood text to palette parameters
 */
function moodToParameters(mood: string, random: SeededRandom): MoodParameters {
  const moodLower = mood.toLowerCase();
  
  // Comprehensive mood keywords and their parameters
  const moodMappings: Record<string, Partial<MoodParameters>> = {
    // === WARM MOODS ===
    'warm': { baseHue: 30, chromaRange: [0.15, 0.25], harmony: 'analogous' },
    'hot': { baseHue: 15, chromaRange: [0.25, 0.35], harmony: 'triadic' },
    'cozy': { baseHue: 35, chromaRange: [0.12, 0.2], lightnessRange: [0.5, 0.7] },
    'toasty': { baseHue: 28, chromaRange: [0.15, 0.22], lightnessRange: [0.55, 0.7] },
    'fireplace': { baseHue: 20, chromaRange: [0.2, 0.28], lightnessRange: [0.4, 0.6] },
    
    // === HAPPY/POSITIVE MOODS ===
    'happy': { baseHue: 50, chromaRange: [0.2, 0.3], lightnessRange: [0.6, 0.8] },
    'joyful': { baseHue: 55, chromaRange: [0.22, 0.32], lightnessRange: [0.65, 0.85] },
    'cheerful': { baseHue: 45, chromaRange: [0.2, 0.28], lightnessRange: [0.6, 0.8] },
    'uplifting': { baseHue: 60, chromaRange: [0.18, 0.26], lightnessRange: [0.65, 0.8] },
    'optimistic': { baseHue: 52, chromaRange: [0.2, 0.28], lightnessRange: [0.6, 0.75] },
    'bright': { baseHue: 48, chromaRange: [0.25, 0.35], lightnessRange: [0.7, 0.85] },
    'sunny': { baseHue: 55, chromaRange: [0.22, 0.3], lightnessRange: [0.7, 0.85] },
    'radiant': { baseHue: 50, chromaRange: [0.25, 0.35], lightnessRange: [0.65, 0.8] },
    
    // === ENERGETIC MOODS ===
    'energetic': { baseHue: 15, chromaRange: [0.25, 0.35], harmony: 'triadic' },
    'vibrant': { baseHue: random.range(0, 360), chromaRange: [0.28, 0.38], harmony: 'triadic' },
    'dynamic': { baseHue: 25, chromaRange: [0.25, 0.32], harmony: 'split-complementary' },
    'electric': { baseHue: 280, chromaRange: [0.3, 0.4], harmony: 'complementary' },
    'exciting': { baseHue: 10, chromaRange: [0.28, 0.36], harmony: 'triadic' },
    'lively': { baseHue: 35, chromaRange: [0.22, 0.3], harmony: 'triadic' },
    'powerful': { baseHue: 5, chromaRange: [0.25, 0.35], harmony: 'complementary' },
    'intense': { baseHue: 0, chromaRange: [0.28, 0.38], harmony: 'complementary' },
    
    // === PASSIONATE/ROMANTIC ===
    'passionate': { baseHue: 0, chromaRange: [0.2, 0.3], harmony: 'complementary' },
    'romantic': { baseHue: 330, chromaRange: [0.15, 0.25], lightnessRange: [0.6, 0.8] },
    'love': { baseHue: 350, chromaRange: [0.2, 0.28], lightnessRange: [0.55, 0.75] },
    'sensual': { baseHue: 340, chromaRange: [0.18, 0.26], lightnessRange: [0.45, 0.65] },
    'intimate': { baseHue: 335, chromaRange: [0.15, 0.22], lightnessRange: [0.5, 0.7] },
    'desire': { baseHue: 355, chromaRange: [0.22, 0.3], lightnessRange: [0.4, 0.6] },
    
    // === COOL/CALM MOODS ===
    'cool': { baseHue: 210, chromaRange: [0.15, 0.25], harmony: 'analogous' },
    'calm': { baseHue: 200, chromaRange: [0.1, 0.2], lightnessRange: [0.5, 0.7] },
    'peaceful': { baseHue: 180, chromaRange: [0.08, 0.15], lightnessRange: [0.6, 0.8] },
    'serene': { baseHue: 190, chromaRange: [0.1, 0.18], harmony: 'analogous' },
    'tranquil': { baseHue: 195, chromaRange: [0.1, 0.18], lightnessRange: [0.55, 0.75] },
    'relaxed': { baseHue: 185, chromaRange: [0.1, 0.18], lightnessRange: [0.5, 0.7] },
    'soothing': { baseHue: 175, chromaRange: [0.08, 0.16], lightnessRange: [0.55, 0.75] },
    'gentle': { baseHue: 170, chromaRange: [0.08, 0.14], lightnessRange: [0.6, 0.8] },
    'soft': { baseHue: 180, chromaRange: [0.08, 0.15], lightnessRange: [0.65, 0.85] },
    'mellow': { baseHue: 175, chromaRange: [0.1, 0.16], lightnessRange: [0.5, 0.7] },
    'zen': { baseHue: 165, chromaRange: [0.06, 0.12], lightnessRange: [0.55, 0.75] },
    'meditative': { baseHue: 260, chromaRange: [0.08, 0.14], lightnessRange: [0.5, 0.7] },
    
    // === NATURE - OCEAN/WATER ===
    'ocean': { baseHue: 200, chromaRange: [0.15, 0.25], harmony: 'analogous' },
    'sea': { baseHue: 195, chromaRange: [0.15, 0.24], harmony: 'analogous' },
    'beach': { baseHue: 45, chromaRange: [0.12, 0.2], lightnessRange: [0.6, 0.8] },
    'coastal': { baseHue: 190, chromaRange: [0.12, 0.22], harmony: 'analogous' },
    'nautical': { baseHue: 215, chromaRange: [0.18, 0.26], harmony: 'complementary' },
    'aqua': { baseHue: 180, chromaRange: [0.18, 0.28], harmony: 'analogous' },
    'marine': { baseHue: 205, chromaRange: [0.14, 0.22], harmony: 'analogous' },
    'tidal': { baseHue: 195, chromaRange: [0.12, 0.2], lightnessRange: [0.45, 0.65] },
    'underwater': { baseHue: 200, chromaRange: [0.15, 0.22], lightnessRange: [0.35, 0.55] },
    'lagoon': { baseHue: 175, chromaRange: [0.18, 0.26], lightnessRange: [0.5, 0.7] },
    'coral': { baseHue: 15, chromaRange: [0.2, 0.28], lightnessRange: [0.55, 0.75] },
    'reef': { baseHue: 180, chromaRange: [0.2, 0.3], harmony: 'triadic' },
    
    // === NATURE - FOREST/EARTH ===
    'natural': { baseHue: 120, chromaRange: [0.12, 0.22], harmony: 'split-complementary' },
    'earthy': { baseHue: 40, chromaRange: [0.1, 0.18], lightnessRange: [0.4, 0.6] },
    'forest': { baseHue: 130, chromaRange: [0.15, 0.2], lightnessRange: [0.35, 0.55] },
    'woodland': { baseHue: 125, chromaRange: [0.12, 0.2], lightnessRange: [0.4, 0.6] },
    'jungle': { baseHue: 135, chromaRange: [0.18, 0.26], lightnessRange: [0.35, 0.55] },
    'rainforest': { baseHue: 140, chromaRange: [0.2, 0.28], lightnessRange: [0.35, 0.5] },
    'botanical': { baseHue: 115, chromaRange: [0.15, 0.25], harmony: 'analogous' },
    'garden': { baseHue: 110, chromaRange: [0.18, 0.26], lightnessRange: [0.5, 0.7] },
    'meadow': { baseHue: 105, chromaRange: [0.15, 0.22], lightnessRange: [0.55, 0.75] },
    'moss': { baseHue: 125, chromaRange: [0.12, 0.18], lightnessRange: [0.4, 0.55] },
    'fern': { baseHue: 135, chromaRange: [0.14, 0.2], lightnessRange: [0.45, 0.6] },
    'leafy': { baseHue: 120, chromaRange: [0.16, 0.24], lightnessRange: [0.5, 0.7] },
    'organic': { baseHue: 95, chromaRange: [0.1, 0.18], lightnessRange: [0.45, 0.65] },
    'rustic': { baseHue: 35, chromaRange: [0.1, 0.16], lightnessRange: [0.4, 0.55] },
    'country': { baseHue: 40, chromaRange: [0.12, 0.18], lightnessRange: [0.45, 0.65] },
    'farmhouse': { baseHue: 38, chromaRange: [0.08, 0.14], lightnessRange: [0.5, 0.7] },
    
    // === NATURE - MOUNTAINS/DESERT ===
    'mountain': { baseHue: 220, chromaRange: [0.08, 0.15], lightnessRange: [0.4, 0.65] },
    'alpine': { baseHue: 215, chromaRange: [0.1, 0.18], lightnessRange: [0.5, 0.75] },
    'rocky': { baseHue: 30, chromaRange: [0.06, 0.12], lightnessRange: [0.35, 0.55] },
    'stone': { baseHue: 35, chromaRange: [0.04, 0.1], lightnessRange: [0.4, 0.6] },
    'desert': { baseHue: 35, chromaRange: [0.12, 0.2], lightnessRange: [0.55, 0.75] },
    'sand': { baseHue: 42, chromaRange: [0.1, 0.16], lightnessRange: [0.65, 0.8] },
    'sahara': { baseHue: 38, chromaRange: [0.14, 0.22], lightnessRange: [0.6, 0.75] },
    'canyon': { baseHue: 25, chromaRange: [0.15, 0.22], lightnessRange: [0.45, 0.6] },
    'terracotta': { baseHue: 20, chromaRange: [0.15, 0.22], lightnessRange: [0.45, 0.6] },
    
    // === NATURE - SKY/CELESTIAL ===
    'sky': { baseHue: 210, chromaRange: [0.1, 0.2], lightnessRange: [0.6, 0.85] },
    'cloud': { baseHue: 220, chromaRange: [0.02, 0.08], lightnessRange: [0.75, 0.95] },
    'cloudy': { baseHue: 215, chromaRange: [0.04, 0.1], lightnessRange: [0.6, 0.8] },
    'stormy': { baseHue: 230, chromaRange: [0.08, 0.15], lightnessRange: [0.3, 0.5] },
    'thunder': { baseHue: 250, chromaRange: [0.12, 0.2], lightnessRange: [0.25, 0.45] },
    'rainbow': { baseHue: random.range(0, 360), chromaRange: [0.25, 0.35], harmony: 'triadic' },
    
    // === SUNSET/SUNRISE ===
    'sunset': { baseHue: 25, chromaRange: [0.2, 0.3], harmony: 'analogous' },
    'sunrise': { baseHue: 35, chromaRange: [0.18, 0.28], lightnessRange: [0.6, 0.8] },
    'dusk': { baseHue: 280, chromaRange: [0.12, 0.2], lightnessRange: [0.4, 0.6] },
    'dawn': { baseHue: 45, chromaRange: [0.12, 0.2], lightnessRange: [0.6, 0.8] },
    'twilight': { baseHue: 270, chromaRange: [0.15, 0.22], lightnessRange: [0.35, 0.55] },
    'golden': { baseHue: 45, chromaRange: [0.2, 0.3], lightnessRange: [0.6, 0.75] },
    'amber': { baseHue: 40, chromaRange: [0.22, 0.3], lightnessRange: [0.55, 0.7] },
    
    // === SEASONS ===
    'spring': { baseHue: 120, chromaRange: [0.18, 0.26], lightnessRange: [0.6, 0.8] },
    'summer': { baseHue: 55, chromaRange: [0.2, 0.3], lightnessRange: [0.65, 0.85] },
    'autumn': { baseHue: 30, chromaRange: [0.18, 0.26], lightnessRange: [0.45, 0.65] },
    'fall': { baseHue: 28, chromaRange: [0.18, 0.26], lightnessRange: [0.45, 0.65] },
    'winter': { baseHue: 210, chromaRange: [0.08, 0.15], lightnessRange: [0.5, 0.8] },
    'seasonal': { baseHue: random.range(0, 360), chromaRange: [0.15, 0.25], harmony: 'analogous' },
    
    // === FLOWERS/PLANTS ===
    'floral': { baseHue: 330, chromaRange: [0.18, 0.26], lightnessRange: [0.6, 0.8] },
    'bloom': { baseHue: 340, chromaRange: [0.2, 0.28], lightnessRange: [0.6, 0.8] },
    'rose': { baseHue: 350, chromaRange: [0.2, 0.28], lightnessRange: [0.5, 0.7] },
    'lavender': { baseHue: 270, chromaRange: [0.15, 0.22], lightnessRange: [0.6, 0.8] },
    'lilac': { baseHue: 280, chromaRange: [0.14, 0.2], lightnessRange: [0.65, 0.8] },
    'peony': { baseHue: 345, chromaRange: [0.18, 0.25], lightnessRange: [0.6, 0.75] },
    'orchid': { baseHue: 290, chromaRange: [0.2, 0.28], lightnessRange: [0.55, 0.75] },
    'tulip': { baseHue: 0, chromaRange: [0.22, 0.3], lightnessRange: [0.55, 0.7] },
    'daisy': { baseHue: 55, chromaRange: [0.18, 0.25], lightnessRange: [0.7, 0.85] },
    'sunflower': { baseHue: 50, chromaRange: [0.25, 0.32], lightnessRange: [0.6, 0.75] },
    'cherry': { baseHue: 340, chromaRange: [0.2, 0.28], lightnessRange: [0.55, 0.75] },
    'blossom': { baseHue: 335, chromaRange: [0.16, 0.24], lightnessRange: [0.7, 0.85] },
    
    // === FRUITS ===
    'citrus': { baseHue: 50, chromaRange: [0.25, 0.35], lightnessRange: [0.6, 0.8] },
    'lemon': { baseHue: 55, chromaRange: [0.28, 0.36], lightnessRange: [0.7, 0.85] },
    'orange': { baseHue: 30, chromaRange: [0.25, 0.33], lightnessRange: [0.6, 0.75] },
    'lime': { baseHue: 100, chromaRange: [0.25, 0.33], lightnessRange: [0.55, 0.7] },
    'berry': { baseHue: 320, chromaRange: [0.2, 0.28], lightnessRange: [0.35, 0.55] },
    'grape': { baseHue: 280, chromaRange: [0.2, 0.28], lightnessRange: [0.35, 0.5] },
    'peach': { baseHue: 25, chromaRange: [0.15, 0.22], lightnessRange: [0.7, 0.85] },
    'mint': { baseHue: 160, chromaRange: [0.15, 0.22], lightnessRange: [0.6, 0.8] },
    
    // === SPACE/COSMIC ===
    'cosmic': { baseHue: 270, chromaRange: [0.2, 0.3], harmony: 'triadic' },
    'galaxy': { baseHue: 280, chromaRange: [0.18, 0.28], lightnessRange: [0.25, 0.5] },
    'stellar': { baseHue: 260, chromaRange: [0.15, 0.25], lightnessRange: [0.3, 0.6] },
    'nebula': { baseHue: 290, chromaRange: [0.2, 0.3], lightnessRange: [0.3, 0.55] },
    'aurora': { baseHue: 140, chromaRange: [0.2, 0.3], harmony: 'triadic' },
    'celestial': { baseHue: 240, chromaRange: [0.15, 0.25], lightnessRange: [0.3, 0.6] },
    'starry': { baseHue: 250, chromaRange: [0.12, 0.2], lightnessRange: [0.2, 0.4] },
    'lunar': { baseHue: 220, chromaRange: [0.04, 0.1], lightnessRange: [0.5, 0.8] },
    'solar': { baseHue: 50, chromaRange: [0.25, 0.35], lightnessRange: [0.65, 0.85] },
    'space': { baseHue: 260, chromaRange: [0.15, 0.25], lightnessRange: [0.15, 0.35] },
    'midnight': { baseHue: 240, chromaRange: [0.1, 0.18], lightnessRange: [0.15, 0.3] },
    
    // === DARK/MOODY ===
    'dark': { baseHue: 260, chromaRange: [0.1, 0.18], lightnessRange: [0.15, 0.35] },
    'night': { baseHue: 240, chromaRange: [0.08, 0.15], lightnessRange: [0.15, 0.3] },
    'mysterious': { baseHue: 270, chromaRange: [0.15, 0.25], lightnessRange: [0.3, 0.5] },
    'moody': { baseHue: 255, chromaRange: [0.1, 0.2], lightnessRange: [0.3, 0.5] },
    'gothic': { baseHue: 280, chromaRange: [0.12, 0.2], lightnessRange: [0.15, 0.35] },
    'noir': { baseHue: 0, chromaRange: [0.02, 0.08], lightnessRange: [0.1, 0.25] },
    'dramatic': { baseHue: 0, chromaRange: [0.2, 0.3], harmony: 'complementary' },
    'brooding': { baseHue: 260, chromaRange: [0.08, 0.15], lightnessRange: [0.2, 0.4] },
    'shadowy': { baseHue: 250, chromaRange: [0.06, 0.12], lightnessRange: [0.2, 0.35] },
    
    // === LIGHT/AIRY ===
    'light': { baseHue: 200, chromaRange: [0.06, 0.12], lightnessRange: [0.8, 0.95] },
    'airy': { baseHue: 210, chromaRange: [0.04, 0.1], lightnessRange: [0.8, 0.95] },
    'ethereal': { baseHue: 260, chromaRange: [0.08, 0.15], lightnessRange: [0.75, 0.9] },
    'dreamy': { baseHue: 280, chromaRange: [0.1, 0.18], lightnessRange: [0.65, 0.85] },
    'fairy': { baseHue: 300, chromaRange: [0.12, 0.2], lightnessRange: [0.7, 0.88] },
    'magical': { baseHue: 285, chromaRange: [0.15, 0.25], harmony: 'triadic' },
    'whimsical': { baseHue: 290, chromaRange: [0.18, 0.26], harmony: 'triadic' },
    'fantasy': { baseHue: 275, chromaRange: [0.18, 0.28], harmony: 'split-complementary' },
    
    // === PASTEL ===
    'pastel': { baseHue: random.range(0, 360), chromaRange: [0.08, 0.15], lightnessRange: [0.75, 0.9] },
    'candy': { baseHue: 330, chromaRange: [0.15, 0.22], lightnessRange: [0.7, 0.85] },
    'cotton': { baseHue: 340, chromaRange: [0.1, 0.16], lightnessRange: [0.8, 0.92] },
    'bubblegum': { baseHue: 335, chromaRange: [0.18, 0.25], lightnessRange: [0.65, 0.8] },
    'sherbet': { baseHue: 30, chromaRange: [0.15, 0.22], lightnessRange: [0.75, 0.88] },
    'ice cream': { baseHue: random.range(0, 360), chromaRange: [0.12, 0.18], lightnessRange: [0.75, 0.9] },
    
    // === NEON/CYBER ===
    'neon': { baseHue: random.range(0, 360), chromaRange: [0.32, 0.42], harmony: 'complementary' },
    'cyber': { baseHue: 280, chromaRange: [0.28, 0.38], harmony: 'split-complementary' },
    'synthwave': { baseHue: 300, chromaRange: [0.25, 0.35], harmony: 'complementary' },
    'retro': { baseHue: 180, chromaRange: [0.2, 0.3], harmony: 'triadic' },
    'vaporwave': { baseHue: 290, chromaRange: [0.2, 0.3], harmony: 'analogous' },
    'futuristic': { baseHue: 195, chromaRange: [0.22, 0.32], harmony: 'split-complementary' },
    'tech': { baseHue: 200, chromaRange: [0.18, 0.28], harmony: 'analogous' },
    'digital': { baseHue: 210, chromaRange: [0.2, 0.3], harmony: 'triadic' },
    
    // === URBAN/INDUSTRIAL ===
    'urban': { baseHue: 220, chromaRange: [0.08, 0.15], lightnessRange: [0.35, 0.55] },
    'city': { baseHue: 210, chromaRange: [0.1, 0.18], lightnessRange: [0.4, 0.6] },
    'industrial': { baseHue: 35, chromaRange: [0.06, 0.12], lightnessRange: [0.35, 0.55] },
    'concrete': { baseHue: 40, chromaRange: [0.02, 0.06], lightnessRange: [0.4, 0.6] },
    'metropolitan': { baseHue: 215, chromaRange: [0.1, 0.18], lightnessRange: [0.35, 0.55] },
    'street': { baseHue: 30, chromaRange: [0.08, 0.14], lightnessRange: [0.3, 0.5] },
    
    // === PROFESSIONAL/BUSINESS ===
    'professional': { baseHue: 210, chromaRange: [0.1, 0.15], lightnessRange: [0.4, 0.7] },
    'corporate': { baseHue: 215, chromaRange: [0.12, 0.18], lightnessRange: [0.4, 0.65] },
    'business': { baseHue: 220, chromaRange: [0.1, 0.16], lightnessRange: [0.4, 0.6] },
    'executive': { baseHue: 230, chromaRange: [0.1, 0.16], lightnessRange: [0.35, 0.55] },
    'formal': { baseHue: 0, chromaRange: [0.02, 0.06], lightnessRange: [0.2, 0.4] },
    'sophisticated': { baseHue: 270, chromaRange: [0.1, 0.18], lightnessRange: [0.35, 0.55] },
    
    // === MINIMAL/MODERN ===
    'minimal': { baseHue: 0, chromaRange: [0.02, 0.08], lightnessRange: [0.3, 0.9] },
    'minimalist': { baseHue: 0, chromaRange: [0.01, 0.05], lightnessRange: [0.25, 0.85] },
    'clean': { baseHue: 210, chromaRange: [0.04, 0.1], lightnessRange: [0.7, 0.95] },
    'modern': { baseHue: random.range(0, 360), chromaRange: [0.15, 0.25], harmony: 'split-complementary' },
    'contemporary': { baseHue: random.range(0, 360), chromaRange: [0.12, 0.22], harmony: 'analogous' },
    'sleek': { baseHue: 220, chromaRange: [0.1, 0.18], lightnessRange: [0.35, 0.6] },
    'crisp': { baseHue: 200, chromaRange: [0.08, 0.15], lightnessRange: [0.7, 0.9] },
    
    // === VINTAGE/RETRO ===
    'vintage': { baseHue: 30, chromaRange: [0.12, 0.18], lightnessRange: [0.45, 0.65] },
    'antique': { baseHue: 35, chromaRange: [0.1, 0.16], lightnessRange: [0.4, 0.6] },
    'nostalgic': { baseHue: 40, chromaRange: [0.1, 0.18], lightnessRange: [0.5, 0.7] },
    'classic': { baseHue: 220, chromaRange: [0.12, 0.2], lightnessRange: [0.4, 0.6] },
    'timeless': { baseHue: 30, chromaRange: [0.08, 0.14], lightnessRange: [0.45, 0.65] },
    'heritage': { baseHue: 25, chromaRange: [0.12, 0.2], lightnessRange: [0.4, 0.55] },
    'sepia': { baseHue: 35, chromaRange: [0.1, 0.16], lightnessRange: [0.45, 0.6] },
    '70s': { baseHue: 35, chromaRange: [0.18, 0.26], lightnessRange: [0.45, 0.65] },
    '80s': { baseHue: 300, chromaRange: [0.22, 0.32], harmony: 'triadic' },
    '90s': { baseHue: 180, chromaRange: [0.2, 0.28], harmony: 'split-complementary' },
    
    // === BOLD/STATEMENT ===
    'bold': { baseHue: random.range(0, 360), chromaRange: [0.25, 0.35], harmony: 'complementary' },
    'statement': { baseHue: random.range(0, 360), chromaRange: [0.28, 0.38], harmony: 'split-complementary' },
    'striking': { baseHue: 0, chromaRange: [0.25, 0.35], harmony: 'complementary' },
    'impactful': { baseHue: 350, chromaRange: [0.25, 0.35], harmony: 'triadic' },
    'attention': { baseHue: 55, chromaRange: [0.28, 0.36], harmony: 'complementary' },
    
    // === FUN/PLAYFUL ===
    'playful': { baseHue: random.range(0, 360), chromaRange: [0.2, 0.3], harmony: 'triadic' },
    'fun': { baseHue: random.range(0, 360), chromaRange: [0.22, 0.32], harmony: 'triadic' },
    'quirky': { baseHue: random.range(0, 360), chromaRange: [0.2, 0.3], harmony: 'split-complementary' },
    'creative': { baseHue: random.range(0, 360), chromaRange: [0.2, 0.28], harmony: 'triadic' },
    'artistic': { baseHue: random.range(0, 360), chromaRange: [0.18, 0.28], harmony: 'split-complementary' },
    'eclectic': { baseHue: random.range(0, 360), chromaRange: [0.2, 0.3], harmony: 'triadic' },
    'festive': { baseHue: 0, chromaRange: [0.25, 0.33], harmony: 'triadic' },
    'party': { baseHue: random.range(0, 360), chromaRange: [0.28, 0.38], harmony: 'triadic' },
    'carnival': { baseHue: random.range(0, 360), chromaRange: [0.3, 0.4], harmony: 'triadic' },
    
    // === ELEGANT/LUXURY ===
    'elegant': { baseHue: 45, chromaRange: [0.1, 0.18], lightnessRange: [0.5, 0.75] },
    'luxury': { baseHue: 50, chromaRange: [0.15, 0.22], lightnessRange: [0.45, 0.65] },
    'luxurious': { baseHue: 45, chromaRange: [0.18, 0.25], lightnessRange: [0.4, 0.6] },
    'opulent': { baseHue: 40, chromaRange: [0.2, 0.28], lightnessRange: [0.45, 0.6] },
    'regal': { baseHue: 280, chromaRange: [0.15, 0.25], lightnessRange: [0.35, 0.55] },
    'royal': { baseHue: 275, chromaRange: [0.18, 0.26], lightnessRange: [0.35, 0.5] },
    'majestic': { baseHue: 270, chromaRange: [0.2, 0.28], lightnessRange: [0.35, 0.55] },
    'glamorous': { baseHue: 320, chromaRange: [0.18, 0.26], lightnessRange: [0.5, 0.7] },
    'chic': { baseHue: 340, chromaRange: [0.12, 0.2], lightnessRange: [0.55, 0.75] },
    
    // === TROPICAL ===
    'tropical': { baseHue: 160, chromaRange: [0.22, 0.32], harmony: 'triadic' },
    'paradise': { baseHue: 180, chromaRange: [0.2, 0.3], harmony: 'analogous' },
    'island': { baseHue: 170, chromaRange: [0.18, 0.28], harmony: 'analogous' },
    'exotic': { baseHue: random.range(0, 360), chromaRange: [0.22, 0.32], harmony: 'triadic' },
    'caribbean': { baseHue: 180, chromaRange: [0.22, 0.3], harmony: 'triadic' },
    'hawaiian': { baseHue: 165, chromaRange: [0.2, 0.3], harmony: 'triadic' },
    
    // === COLD/ICY ===
    'arctic': { baseHue: 200, chromaRange: [0.1, 0.18], lightnessRange: [0.7, 0.9] },
    'icy': { baseHue: 195, chromaRange: [0.08, 0.15], lightnessRange: [0.75, 0.92] },
    'frozen': { baseHue: 200, chromaRange: [0.12, 0.2], lightnessRange: [0.7, 0.88] },
    'frost': { baseHue: 205, chromaRange: [0.08, 0.14], lightnessRange: [0.78, 0.92] },
    'glacier': { baseHue: 195, chromaRange: [0.1, 0.18], lightnessRange: [0.65, 0.85] },
    'polar': { baseHue: 210, chromaRange: [0.06, 0.12], lightnessRange: [0.75, 0.92] },
    'snow': { baseHue: 215, chromaRange: [0.02, 0.08], lightnessRange: [0.85, 0.97] },
    
    // === METALS ===
    'gold': { baseHue: 45, chromaRange: [0.18, 0.26], lightnessRange: [0.55, 0.7] },
    'silver': { baseHue: 220, chromaRange: [0.02, 0.06], lightnessRange: [0.6, 0.8] },
    'bronze': { baseHue: 30, chromaRange: [0.15, 0.22], lightnessRange: [0.45, 0.6] },
    'copper': { baseHue: 25, chromaRange: [0.18, 0.25], lightnessRange: [0.5, 0.65] },
    'metallic': { baseHue: 40, chromaRange: [0.1, 0.18], lightnessRange: [0.5, 0.7] },
    'chrome': { baseHue: 220, chromaRange: [0.02, 0.06], lightnessRange: [0.55, 0.75] },
    
    // === FOOD/DRINK ===
    'coffee': { baseHue: 25, chromaRange: [0.12, 0.2], lightnessRange: [0.25, 0.45] },
    'chocolate': { baseHue: 20, chromaRange: [0.12, 0.2], lightnessRange: [0.2, 0.4] },
    'caramel': { baseHue: 35, chromaRange: [0.18, 0.25], lightnessRange: [0.45, 0.6] },
    'vanilla': { baseHue: 45, chromaRange: [0.08, 0.14], lightnessRange: [0.8, 0.92] },
    'cinnamon': { baseHue: 22, chromaRange: [0.15, 0.22], lightnessRange: [0.4, 0.55] },
    'espresso': { baseHue: 20, chromaRange: [0.1, 0.16], lightnessRange: [0.15, 0.3] },
    'mocha': { baseHue: 25, chromaRange: [0.12, 0.18], lightnessRange: [0.3, 0.45] },
    'wine': { baseHue: 345, chromaRange: [0.15, 0.22], lightnessRange: [0.25, 0.4] },
    'champagne': { baseHue: 50, chromaRange: [0.1, 0.16], lightnessRange: [0.75, 0.88] },
    
    // === EMOTIONS ===
    'sad': { baseHue: 220, chromaRange: [0.08, 0.15], lightnessRange: [0.35, 0.5] },
    'melancholy': { baseHue: 230, chromaRange: [0.1, 0.18], lightnessRange: [0.35, 0.55] },
    'hopeful': { baseHue: 170, chromaRange: [0.15, 0.22], lightnessRange: [0.55, 0.75] },
    'anxious': { baseHue: 40, chromaRange: [0.15, 0.22], lightnessRange: [0.45, 0.6] },
    'angry': { baseHue: 0, chromaRange: [0.25, 0.35], lightnessRange: [0.35, 0.5] },
    'excited': { baseHue: 45, chromaRange: [0.25, 0.35], harmony: 'triadic' },
    'confident': { baseHue: 220, chromaRange: [0.18, 0.26], lightnessRange: [0.4, 0.6] },
    'inspired': { baseHue: random.range(0, 360), chromaRange: [0.2, 0.3], harmony: 'triadic' },
    
    // === CULTURAL ===
    'japanese': { baseHue: 350, chromaRange: [0.15, 0.22], lightnessRange: [0.6, 0.8] },
    'scandinavian': { baseHue: 30, chromaRange: [0.04, 0.1], lightnessRange: [0.7, 0.9] },
    'mediterranean': { baseHue: 200, chromaRange: [0.18, 0.26], harmony: 'analogous' },
    'bohemian': { baseHue: 25, chromaRange: [0.2, 0.28], harmony: 'triadic' },
    'moroccan': { baseHue: 30, chromaRange: [0.22, 0.3], harmony: 'split-complementary' },
    'indian': { baseHue: 35, chromaRange: [0.25, 0.33], harmony: 'triadic' },
    'african': { baseHue: 30, chromaRange: [0.2, 0.3], harmony: 'triadic' },
    'nordic': { baseHue: 210, chromaRange: [0.06, 0.12], lightnessRange: [0.6, 0.85] },
  };
  
  // Find matching mood keyword
  let params: Partial<MoodParameters> | undefined;
  for (const [keyword, mapping] of Object.entries(moodMappings)) {
    if (moodLower.includes(keyword)) {
      params = mapping;
      break;
    }
  }
  
  // Default parameters if no match
  if (!params) {
    params = {
      baseHue: random.range(0, 360),
      chromaRange: [0.12, 0.22],
      lightnessRange: [0.4, 0.8],
      harmony: random.choice(['analogous', 'complementary', 'triadic', 'split-complementary'] as const),
    };
  }
  
  // Fill in missing parameters with defaults
  return {
    baseHue: params.baseHue ?? random.range(0, 360),
    chromaRange: params.chromaRange ?? [0.12, 0.22],
    lightnessRange: params.lightnessRange ?? [0.4, 0.8],
    harmony: params.harmony ?? 'analogous',
  };
}

/**
 * Generate palette from mood text
 * Deterministic via seed, maps mood to palette parameters
 * 
 * @param mood - Mood text (e.g., "calm ocean sunset")
 * @param seed - Optional seed for deterministic generation (uses mood hash if not provided)
 * @returns Generated palette with colors and metadata
 */
export function generateFromMood(mood: string, seed?: number): GeneratedPalette {
  // Use mood hash as seed if not provided
  const actualSeed = seed ?? hashString(mood);
  const random = new SeededRandom(actualSeed);
  
  // Map mood to parameters
  const params = moodToParameters(mood, random);
  
  // Create base color from parameters
  const baseColor: OKLCHColor = {
    l: random.range(params.lightnessRange[0], params.lightnessRange[1]),
    c: random.range(params.chromaRange[0], params.chromaRange[1]),
    h: params.baseHue + random.range(-15, 15), // Add slight variation
  };
  
  const colors: OKLCHColor[] = [baseColor];
  
  // Generate colors based on harmony strategy
  switch (params.harmony) {
    case 'analogous':
      colors.push(...generateAnalogous(baseColor, 30, 4));
      break;
    case 'complementary':
      colors.push(generateComplementary(baseColor));
      colors.push(...generateAnalogous(baseColor, 20, 2));
      break;
    case 'triadic':
      colors.push(...generateTriadic(baseColor));
      colors.push(...generateAnalogous(baseColor, 15, 1));
      break;
    case 'split-complementary':
      colors.push(...generateSplitComplementary(baseColor, 30));
      colors.push(...generateAnalogous(baseColor, 20, 1));
      break;
  }
  
  // Add neutrals
  const neutrals = generateNeutrals(baseColor, 4);
  colors.push(...neutrals);
  
  // Apply quality gates
  const filtered = applyQualityGates(colors, {
    maxChroma: 0.4,
    removeDuplicates: true,
    duplicateThreshold: 0.02,
  });
  
  // Ensure 8-12 colors
  let finalColors = filtered;
  if (filtered.length < 8) {
    const extra = generateAnalogous(baseColor, 25, 4);
    finalColors = applyQualityGates([...filtered, ...extra], {
      maxChroma: 0.4,
      removeDuplicates: true,
      duplicateThreshold: 0.02,
    });
  }
  
  if (finalColors.length > 12) {
    finalColors = finalColors.slice(0, 12);
  }
  
  // Assign roles - this creates BACKGROUND, TEXT, PRIMARY, SECONDARY, etc.
  const assignedColors = assignRoles(finalColors);
  
  // Shuffle the first 5 main colors (excluding BACKGROUND/TEXT which will be 
  // treated as derived) to create variety in palette presentation
  // Fisher-Yates shuffle on the main saturated colors
  const mainColorRoles = [
    ColorRole.PRIMARY,
    ColorRole.SECONDARY,
    ColorRole.ACCENT,
    ColorRole.INFO,
    ColorRole.SUCCESS,
    ColorRole.WARNING,
    ColorRole.ERROR,
  ];
  
  // Separate main colors from background/text
  const mainColors = assignedColors.filter(c => mainColorRoles.includes(c.role as ColorRole));
  const derivedColors = assignedColors.filter(c => 
    c.role === ColorRole.BACKGROUND || c.role === ColorRole.TEXT
  );
  
  // Shuffle main colors using seeded random for deterministic but varied results
  for (let i = mainColors.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    [mainColors[i], mainColors[j]] = [mainColors[j], mainColors[i]];
  }
  
  // Take up to 5 main colors (shuffled order) + derived colors at the end
  const shuffledMain = mainColors.slice(0, 5);
  
  // Reassign roles to shuffled main colors (order now varies)
  const roleOrder = [
    ColorRole.PRIMARY,
    ColorRole.SECONDARY,
    ColorRole.ACCENT,
    ColorRole.INFO,
    ColorRole.SUCCESS,
  ];
  const reorderedColors: AssignedColor[] = shuffledMain.map((color, i) => ({
    role: roleOrder[i] || ColorRole.ACCENT,
    color: color.color,
  }));
  
  // Add background and text at the end (these are "derived" colors in the UI)
  reorderedColors.push(...derivedColors);
  
  return {
    colors: reorderedColors,
    metadata: {
      generator: 'mood',
      explanation: `Generated ${params.harmony} palette with ${reorderedColors.length} colors inspired by: "${mood}"`,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Calculate circular distance between two hue values (0-360)
 * Accounts for the wraparound at 0/360 degrees
 */
function circularHueDistance(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 360 - diff);
}

/**
 * Extract dominant colors from RGB pixel data
 * Uses a simple k-means clustering approach
 * 
 * @param pixels - Array of RGB colors from image
 * @param numColors - Number of dominant colors to extract (default 3)
 * @returns Array of dominant OKLCH colors
 */
export function extractDominantColors(
  pixels: { r: number; g: number; b: number }[],
  numColors: number = 3
): OKLCHColor[] {
  if (pixels.length === 0) {
    return [];
  }
  
  // Convert all pixels to OKLCH
  const oklchPixels: OKLCHColor[] = pixels.map(rgbToOklch);
  
  // Simple k-means clustering
  // Initialize centroids using evenly spaced indices from the pixel array
  const centroids: OKLCHColor[] = [];
  for (let i = 0; i < numColors; i++) {
    const idx = Math.floor((i / numColors) * oklchPixels.length);
    centroids.push({ ...oklchPixels[idx] });
  }
  
  // Run k-means for up to 10 iterations (usually converges faster)
  const maxIterations = 10;
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign pixels to nearest centroid
    const clusters: OKLCHColor[][] = Array(numColors).fill(null).map(() => []);
    
    for (const pixel of oklchPixels) {
      let minDist = Infinity;
      let closestCluster = 0;
      
      for (let i = 0; i < centroids.length; i++) {
        // Calculate distance using circular hue distance
        const hueDist = circularHueDistance(pixel.h, centroids[i].h) / 360;
        const dist = Math.sqrt(
          Math.pow(pixel.l - centroids[i].l, 2) +
          Math.pow(pixel.c - centroids[i].c, 2) +
          Math.pow(hueDist, 2) // Normalized hue distance
        );
        
        if (dist < minDist) {
          minDist = dist;
          closestCluster = i;
        }
      }
      
      clusters[closestCluster].push(pixel);
    }
    
    // Update centroids
    for (let i = 0; i < centroids.length; i++) {
      if (clusters[i].length > 0) {
        const avgL = clusters[i].reduce((sum, p) => sum + p.l, 0) / clusters[i].length;
        const avgC = clusters[i].reduce((sum, p) => sum + p.c, 0) / clusters[i].length;
        
        // Average hue (handle circular nature)
        const sinSum = clusters[i].reduce((sum, p) => sum + Math.sin(p.h * Math.PI / 180), 0);
        const cosSum = clusters[i].reduce((sum, p) => sum + Math.cos(p.h * Math.PI / 180), 0);
        let avgH = Math.atan2(sinSum, cosSum) * 180 / Math.PI;
        if (avgH < 0) avgH += 360;
        
        centroids[i] = { l: avgL, c: avgC, h: avgH };
      }
      // Empty clusters retain their previous centroid position
      // This is acceptable for our use case and avoids reinitializing
    }
  }
  
  return centroids;
}

/**
 * Generate palette from image data
 * Upload image → palette output, works on typical phone photos
 * 
 * @param imagePixels - Array of RGB colors from image (sampled pixels)
 * @returns Generated palette with colors and metadata
 */
export function generateFromImage(
  imagePixels: { r: number; g: number; b: number }[]
): GeneratedPalette {
  // Extract 2-4 dominant colors from image
  // For every ~1000 pixels, extract 1 dominant color (up to 4)
  const PIXELS_PER_DOMINANT_COLOR = 1000;
  const numDominant = Math.min(4, Math.max(2, Math.floor(imagePixels.length / PIXELS_PER_DOMINANT_COLOR)));
  const dominantColors = extractDominantColors(imagePixels, numDominant);
  
  const colors: OKLCHColor[] = [...dominantColors];
  
  // Use the most vibrant (highest chroma) color as base for generating additional colors
  const mostVibrantColor = dominantColors.reduce((prev, curr) => 
    curr.c > prev.c ? curr : prev
  );
  
  // Add some analogous colors based on dominant colors
  for (const dominant of dominantColors) {
    const analogous = generateAnalogous(dominant, 25, 1);
    colors.push(...analogous);
  }
  
  // Add neutrals based on most vibrant color
  const neutrals = generateNeutrals(mostVibrantColor, 3);
  colors.push(...neutrals);
  
  // Apply quality gates
  const filtered = applyQualityGates(colors, {
    maxChroma: 0.4,
    removeDuplicates: true,
    duplicateThreshold: 0.03,
  });
  
  // Ensure 8-12 colors
  let finalColors = filtered;
  if (filtered.length < 8) {
    const extra = generateAnalogous(mostVibrantColor, 30, 4);
    finalColors = applyQualityGates([...filtered, ...extra], {
      maxChroma: 0.4,
      removeDuplicates: true,
      duplicateThreshold: 0.03,
    });
  }
  
  if (finalColors.length > 12) {
    // Prioritize dominant colors
    const dominant = finalColors.filter(c => 
      dominantColors.some(d => 
        Math.abs(d.l - c.l) < 0.05 && 
        Math.abs(d.c - c.c) < 0.05 && 
        Math.abs(d.h - c.h) < 10
      )
    );
    const others = finalColors.filter(c => !dominant.includes(c));
    finalColors = [...dominant, ...others].slice(0, 12);
  }
  
  // Assign roles
  const assignedColors = assignRoles(finalColors);
  
  return {
    colors: assignedColors,
    metadata: {
      generator: 'image',
      explanation: `Generated palette with ${assignedColors.length} colors extracted from ${numDominant} dominant colors in the image.`,
      timestamp: new Date().toISOString(),
    },
  };
}
