import { OKLCHColor } from './types';
import {
  generateAnalogous,
  generateComplementary,
  generateSplitComplementary,
  generateTriadic,
  generateNeutrals,
  applyQualityGates,
} from './harmony';
import { assignRoles, AssignedColor } from './contrast';
import { rgbToOklch } from './oklch';

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
      generator: 'base-color',
      explanation: `Generated palette from base color with ${assignedColors.length} harmonious colors using complementary, analogous, and neutral strategies.`,
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
  
  // Assign roles
  const assignedColors = assignRoles(finalColors);
  
  return {
    colors: assignedColors,
    metadata: {
      generator: 'mood',
      explanation: `Generated ${params.harmony} palette with ${assignedColors.length} colors inspired by: "${mood}"`,
      timestamp: new Date().toISOString(),
    },
  };
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
  // Initialize centroids randomly
  const centroids: OKLCHColor[] = [];
  for (let i = 0; i < numColors; i++) {
    const idx = Math.floor((i / numColors) * oklchPixels.length);
    centroids.push({ ...oklchPixels[idx] });
  }
  
  // Run k-means for a few iterations
  for (let iter = 0; iter < 10; iter++) {
    // Assign pixels to nearest centroid
    const clusters: OKLCHColor[][] = Array(numColors).fill(null).map(() => []);
    
    for (const pixel of oklchPixels) {
      let minDist = Infinity;
      let closestCluster = 0;
      
      for (let i = 0; i < centroids.length; i++) {
        const dist = Math.sqrt(
          Math.pow(pixel.l - centroids[i].l, 2) +
          Math.pow(pixel.c - centroids[i].c, 2) +
          Math.pow((pixel.h - centroids[i].h) / 360, 2) // Normalize hue
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
  const numDominant = Math.min(4, Math.max(2, Math.floor(imagePixels.length / 1000)));
  const dominantColors = extractDominantColors(imagePixels, numDominant);
  
  const colors: OKLCHColor[] = [...dominantColors];
  
  // Use the most vibrant color as base for generating additional colors
  const baseColor = dominantColors.reduce((prev, curr) => 
    curr.c > prev.c ? curr : prev
  );
  
  // Add some analogous colors based on dominant colors
  for (const dominant of dominantColors) {
    const analogous = generateAnalogous(dominant, 25, 1);
    colors.push(...analogous);
  }
  
  // Add neutrals based on base color
  const neutrals = generateNeutrals(baseColor, 3);
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
    const extra = generateAnalogous(baseColor, 30, 4);
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
