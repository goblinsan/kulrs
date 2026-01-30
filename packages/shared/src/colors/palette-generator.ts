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
  
  // Common mood keywords and their parameters
  const moodMappings: Record<string, Partial<MoodParameters>> = {
    // Warm moods
    'warm': { baseHue: 30, chromaRange: [0.15, 0.25], harmony: 'analogous' },
    'happy': { baseHue: 50, chromaRange: [0.2, 0.3], lightnessRange: [0.6, 0.8] },
    'energetic': { baseHue: 15, chromaRange: [0.25, 0.35], harmony: 'triadic' },
    'passionate': { baseHue: 0, chromaRange: [0.2, 0.3], harmony: 'complementary' },
    
    // Cool moods
    'cool': { baseHue: 210, chromaRange: [0.15, 0.25], harmony: 'analogous' },
    'calm': { baseHue: 200, chromaRange: [0.1, 0.2], lightnessRange: [0.5, 0.7] },
    'peaceful': { baseHue: 180, chromaRange: [0.08, 0.15], lightnessRange: [0.6, 0.8] },
    'serene': { baseHue: 190, chromaRange: [0.1, 0.18], harmony: 'analogous' },
    
    // Nature moods
    'natural': { baseHue: 120, chromaRange: [0.12, 0.22], harmony: 'split-complementary' },
    'earthy': { baseHue: 40, chromaRange: [0.1, 0.18], lightnessRange: [0.4, 0.6] },
    'ocean': { baseHue: 200, chromaRange: [0.15, 0.25], harmony: 'analogous' },
    'forest': { baseHue: 130, chromaRange: [0.15, 0.2], lightnessRange: [0.35, 0.55] },
    
    // Emotional moods
    'romantic': { baseHue: 330, chromaRange: [0.15, 0.25], lightnessRange: [0.6, 0.8] },
    'mysterious': { baseHue: 270, chromaRange: [0.15, 0.25], lightnessRange: [0.3, 0.5] },
    'professional': { baseHue: 210, chromaRange: [0.1, 0.15], lightnessRange: [0.4, 0.7] },
    'playful': { baseHue: random.range(0, 360), chromaRange: [0.2, 0.3], harmony: 'triadic' },
    
    // Other moods
    'minimal': { baseHue: 0, chromaRange: [0.02, 0.08], lightnessRange: [0.3, 0.9] },
    'vintage': { baseHue: 30, chromaRange: [0.12, 0.18], lightnessRange: [0.45, 0.65] },
    'modern': { baseHue: random.range(0, 360), chromaRange: [0.15, 0.25], harmony: 'split-complementary' },
    'bold': { baseHue: random.range(0, 360), chromaRange: [0.25, 0.35], harmony: 'complementary' },
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
