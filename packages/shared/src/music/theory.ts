/**
 * Music Theory Engine
 *
 * Provides key/scale awareness, common chord progressions,
 * chord suggestion/alternatives, and chord-to-colour reverse mapping.
 */

import {
  NOTE_NAMES,
  type NoteName,
  type ChordQuality,
  type ChordStep,
  type ColorMusicMapping,
  type Composition,
  buildChordStep,
  hexToOklchApprox,
  colorToChord,
} from './mappings.js';

// ── Scale & key definitions ──────────────────────────────────────────────

export type ScaleType = 'major' | 'minor' | 'dorian' | 'mixolydian';

/** Semitone intervals for each scale type. */
const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

/** Diatonic chord qualities for each scale degree (I-VII). */
const DIATONIC_QUALITIES: Record<ScaleType, ChordQuality[]> = {
  major: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
  minor: [
    'minor',
    'diminished',
    'major',
    'minor',
    'minor',
    'major',
    'major',
  ],
  dorian: [
    'minor',
    'minor',
    'major',
    'major',
    'minor',
    'diminished',
    'major',
  ],
  mixolydian: [
    'major',
    'minor',
    'diminished',
    'major',
    'minor',
    'minor',
    'major',
  ],
};

export interface KeySignature {
  root: NoteName;
  scale: ScaleType;
  label: string;
}

export interface ChordInKey {
  root: NoteName;
  quality: ChordQuality;
  degree: number; // 1-7
  label: string;
  romanNumeral: string;
}

// ── Common progressions ──────────────────────────────────────────────────

export interface ProgressionPreset {
  name: string;
  /** Scale degrees (1-indexed). */
  degrees: number[];
  description: string;
}

export const PROGRESSION_PRESETS: ProgressionPreset[] = [
  {
    name: 'Pop (I-V-vi-IV)',
    degrees: [1, 5, 6, 4],
    description: 'The most common pop/rock progression',
  },
  {
    name: 'Classic (I-IV-V-I)',
    degrees: [1, 4, 5, 1],
    description: 'Traditional three-chord progression',
  },
  {
    name: '50s (I-vi-IV-V)',
    degrees: [1, 6, 4, 5],
    description: 'Classic doo-wop / 1950s feel',
  },
  {
    name: 'Sad (vi-IV-I-V)',
    degrees: [6, 4, 1, 5],
    description: 'Melancholic, starts on the relative minor',
  },
  {
    name: 'Jazz ii-V-I',
    degrees: [2, 5, 1],
    description: 'Fundamental jazz cadence',
  },
  {
    name: 'Andalusian (i-VII-VI-V)',
    degrees: [1, 7, 6, 5],
    description: 'Flamenco / Spanish feel (works best in minor)',
  },
  {
    name: 'Canon (I-V-vi-iii-IV-I-IV-V)',
    degrees: [1, 5, 6, 3, 4, 1, 4, 5],
    description: "Pachelbel's Canon progression",
  },
  {
    name: 'Blues (I-I-IV-I-V-IV-I-V)',
    degrees: [1, 1, 4, 1, 5, 4, 1, 5],
    description: '8-bar blues progression',
  },
  {
    name: 'Emotional (I-iii-vi-IV)',
    degrees: [1, 3, 6, 4],
    description: 'Dreamy, cinematic feel',
  },
  {
    name: 'Rock (I-bVII-IV-I)',
    degrees: [1, 7, 4, 1],
    description: 'Power-chord rock feel (mixolydian)',
  },
];

// ── Roman numeral display ────────────────────────────────────────────────

const ROMAN_MAJOR = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const ROMAN_MINOR = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];

function romanNumeral(degree: number, quality: ChordQuality): string {
  const idx = degree - 1;
  const isMinorish = ['minor', 'min7', 'diminished'].includes(quality);
  let rn = isMinorish ? ROMAN_MINOR[idx] : ROMAN_MAJOR[idx];
  if (quality === 'diminished') rn += '°';
  if (quality === 'augmented') rn += '+';
  if (quality === 'dom7') rn += '7';
  if (quality === 'min7') rn += '7';
  if (quality === 'maj7') rn += 'Δ7';
  return rn;
}

// ── Core functions ───────────────────────────────────────────────────────

/**
 * Get all diatonic chords in a given key.
 */
export function getChordsInKey(
  root: NoteName,
  scale: ScaleType
): ChordInKey[] {
  const rootIndex = NOTE_NAMES.indexOf(root);
  const intervals = SCALE_INTERVALS[scale];
  const qualities = DIATONIC_QUALITIES[scale];

  return intervals.map((interval, i) => {
    const noteIndex = (rootIndex + interval) % 12;
    const noteName = NOTE_NAMES[noteIndex];
    const quality = qualities[i];
    const degree = i + 1;
    const suffix =
      quality === 'major'
        ? ''
        : quality === 'minor'
          ? 'm'
          : quality === 'diminished'
            ? 'dim'
            : quality;
    return {
      root: noteName,
      quality,
      degree,
      label: `${noteName}${suffix}`,
      romanNumeral: romanNumeral(degree, quality),
    };
  });
}

/**
 * Build a chord progression from a preset + key.
 */
export function progressionToChords(
  key: NoteName,
  scale: ScaleType,
  preset: ProgressionPreset,
  octave = 4
): ChordStep[] {
  const diatonic = getChordsInKey(key, scale);
  return preset.degrees.map(degree => {
    const chord = diatonic[(degree - 1) % 7];
    return buildChordStep(chord.root, octave, chord.quality);
  });
}

/**
 * Build a full composition from a chord progression preset.
 */
export function progressionToComposition(
  key: NoteName,
  scale: ScaleType,
  preset: ProgressionPreset,
  octave = 4,
  tempo = 100
): Composition {
  const chordSteps = progressionToChords(key, scale, preset, octave);
  const steps: ColorMusicMapping[] = chordSteps.map(chord => {
    const hex = chordToHex(chord.root.name, chord.quality);
    const oklch = hexToOklchApprox(hex);
    return { hex, oklch, chord };
  });
  return { tempo, steps, timeSignatureTop: 4 };
}

// ── Chord suggestions ────────────────────────────────────────────────────

export interface ChordSuggestion {
  root: NoteName;
  quality: ChordQuality;
  label: string;
  reason: string;
}

/**
 * Detect the best-matching key for an array of chord steps.
 */
export function detectKey(
  chords: { root: MusicNote; quality: ChordQuality }[]
): KeySignature {
  let bestKey: KeySignature = { root: 'C', scale: 'major', label: 'C major' };
  let bestScore = -1;

  for (const root of NOTE_NAMES) {
    for (const scale of ['major', 'minor'] as ScaleType[]) {
      const diatonic = getChordsInKey(root, scale);
      let score = 0;
      for (const chord of chords) {
        const match = diatonic.find(
          d => d.root === chord.root.name && d.quality === chord.quality
        );
        if (match) score += 2;
        else if (diatonic.find(d => d.root === chord.root.name)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestKey = { root, scale, label: `${root} ${scale}` };
      }
    }
  }
  return bestKey;
}

/**
 * Suggest complementary chord alternatives for a given step,
 * based on the detected key and surrounding chords.
 */
export function suggestAlternatives(
  currentChord: ChordStep,
  allChords: ChordStep[],
  maxSuggestions = 4
): ChordSuggestion[] {
  const key = detectKey(allChords);
  const diatonic = getChordsInKey(key.root, key.scale);
  const suggestions: ChordSuggestion[] = [];

  const currentRoot = currentChord.root.name;
  const currentQuality = currentChord.quality;

  // 1. If current chord is NOT diatonic, suggest the diatonic version
  const diatonicMatch = diatonic.find(d => d.root === currentRoot);
  if (diatonicMatch && diatonicMatch.quality !== currentQuality) {
    suggestions.push({
      root: diatonicMatch.root,
      quality: diatonicMatch.quality,
      label: diatonicMatch.label,
      reason: `Diatonic in ${key.label} (${diatonicMatch.romanNumeral})`,
    });
  }

  // 2. Suggest other diatonic chords not already in the progression
  const usedRoots = new Set(allChords.map(c => c.root.name));
  for (const d of diatonic) {
    if (!usedRoots.has(d.root) && d.root !== currentRoot) {
      suggestions.push({
        root: d.root,
        quality: d.quality,
        label: d.label,
        reason: `${d.romanNumeral} in ${key.label}`,
      });
    }
  }

  // 3. Suggest dominant 7th of the NEXT chord (secondary dominant)
  const currentIndex = allChords.indexOf(currentChord);
  if (currentIndex >= 0 && currentIndex < allChords.length - 1) {
    const nextChord = allChords[currentIndex + 1];
    const domRoot = NOTE_NAMES[(NOTE_NAMES.indexOf(nextChord.root.name) + 7) % 12];
    suggestions.push({
      root: domRoot,
      quality: 'dom7',
      label: `${domRoot}7`,
      reason: `V7 of next chord (${nextChord.root.name})`,
    });
  }

  // 4. Relative major/minor swap
  const rootIdx = NOTE_NAMES.indexOf(currentRoot);
  if (currentQuality === 'minor') {
    const relMajor = NOTE_NAMES[(rootIdx + 3) % 12];
    suggestions.push({
      root: relMajor,
      quality: 'major',
      label: relMajor,
      reason: 'Relative major',
    });
  } else if (currentQuality === 'major') {
    const relMinor = NOTE_NAMES[(rootIdx + 9) % 12];
    suggestions.push({
      root: relMinor,
      quality: 'minor',
      label: `${relMinor}m`,
      reason: 'Relative minor',
    });
  }

  // Deduplicate and limit
  const seen = new Set<string>();
  return suggestions
    .filter(s => {
      const k = `${s.root}${s.quality}`;
      if (
        seen.has(k) ||
        (s.root === currentRoot && s.quality === currentQuality)
      )
        return false;
      seen.add(k);
      return true;
    })
    .slice(0, maxSuggestions);
}

// ── Key-aware palette → music ────────────────────────────────────────────

/**
 * Improved palette-to-composition: snaps raw colour-derived chords
 * to the nearest diatonic chord in the best-matching key.
 */
export function paletteToHarmonicComposition(
  hexColors: string[],
  tempo = 100
): Composition & { detectedKey: KeySignature } {
  // Step 1: raw mapping
  const rawSteps = hexColors.map(hex => {
    const oklch = hexToOklchApprox(hex);
    const chord = colorToChord(oklch);
    return { hex, oklch, chord };
  });

  // Step 2: detect key from raw chords
  const key = detectKey(rawSteps.map(s => s.chord));
  const diatonic = getChordsInKey(key.root, key.scale);

  // Step 3: snap each chord to nearest diatonic chord
  const steps: ColorMusicMapping[] = rawSteps.map(raw => {
    const snapped = snapToDiatonic(raw.chord, diatonic);
    return { hex: raw.hex, oklch: raw.oklch, chord: snapped };
  });

  return { tempo, steps, timeSignatureTop: 4, detectedKey: key };
}

function snapToDiatonic(
  chord: ChordStep,
  diatonic: ChordInKey[]
): ChordStep {
  // Find closest diatonic root by semitone distance
  const rootIdx = NOTE_NAMES.indexOf(chord.root.name);
  let bestDist = 999;
  let bestMatch = diatonic[0];

  for (const d of diatonic) {
    const dIdx = NOTE_NAMES.indexOf(d.root);
    const dist = Math.min(
      Math.abs(rootIdx - dIdx),
      12 - Math.abs(rootIdx - dIdx)
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestMatch = d;
    }
  }

  return buildChordStep(
    bestMatch.root,
    chord.root.octave,
    bestMatch.quality,
    chord.velocity,
    chord.beats
  );
}

// ── Chord → Colour (reverse mapping) ────────────────────────────────────

/**
 * Map a chord root + quality back to a hex colour.
 *
 *   Root note → Hue (semitone × 30°)
 *   Quality   → Chroma (major=high, minor=mid, dim=low)
 *   Fixed lightness 0.65 for vibrant palette colours.
 */
export function chordToHex(
  root: NoteName,
  quality: ChordQuality,
  lightness = 0.65
): string {
  const hue = NOTE_NAMES.indexOf(root) * 30;

  const qualityToChroma: Record<ChordQuality, number> = {
    major: 0.30,
    minor: 0.18,
    diminished: 0.05,
    augmented: 0.32,
    sus2: 0.04,
    sus4: 0.08,
    dom7: 0.24,
    min7: 0.12,
    maj7: 0.28,
  };
  const chroma = qualityToChroma[quality] ?? 0.15;

  return oklchToHexString(lightness, chroma, hue);
}

/**
 * Convert OKLCH to hex (simplified for the reverse mapping).
 */
function oklchToHexString(l: number, c: number, h: number): string {
  // Approximate OKLCH → sRGB via Lab intermediary
  const labL = l * 100;
  const hRad = (h * Math.PI) / 180;
  const a = c * 150 * Math.cos(hRad);
  const bLab = c * 150 * Math.sin(hRad);

  // Lab → XYZ
  const fy = (labL + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - bLab / 200;

  const x3 = fx * fx * fx;
  const z3 = fz * fz * fz;
  const xr = x3 > 0.008856 ? x3 : (116 * fx - 16) / 903.3;
  const yr = labL > 7.9996 ? fy * fy * fy : labL / 903.3;
  const zr = z3 > 0.008856 ? z3 : (116 * fz - 16) / 903.3;

  const x = xr * 0.95047;
  const y = yr;
  const z = zr * 1.08883;

  // XYZ → linear RGB
  let rl = 3.2406 * x - 1.5372 * y - 0.4986 * z;
  let gl = -0.9689 * x + 1.8758 * y + 0.0415 * z;
  let bl = 0.0557 * x - 0.2040 * y + 1.0570 * z;

  // Gamma
  const gamma = (v: number) =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  rl = gamma(rl);
  gl = gamma(gl);
  bl = gamma(bl);

  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return `#${clamp(rl).toString(16).padStart(2, '0')}${clamp(gl).toString(16).padStart(2, '0')}${clamp(bl).toString(16).padStart(2, '0')}`.toUpperCase();
}

// ── Needed type re-export ────────────────────────────────────────────────
import type { MusicNote } from './mappings.js';

// ── Apply preset to existing palette ─────────────────────────────────────

/**
 * Apply a chord progression preset to an existing set of palette colours.
 *
 * Instead of replacing all colours, this:
 *  1. Determines the target key from the first colour's root note + the chosen scale.
 *  2. Builds the diatonic chords for each degree in the preset.
 *  3. For each preset degree, finds the closest existing palette colour
 *     (by semitone distance between the colour's natural root and the
 *     target chord root). If a colour has already been used, the next-closest
 *     is chosen. Any remaining preset slots that can't be matched get a
 *     generated colour from chordToHex.
 *  4. Returns a new Composition whose step order follows the preset but
 *     whose colours come from the original palette wherever possible.
 */
export function applyPresetToPalette(
  hexColors: string[],
  preset: ProgressionPreset,
  scale: ScaleType,
  tempo = 100
): Composition & { detectedKey: KeySignature } {
  // Derive root key from first colour
  const firstOklch = hexToOklchApprox(hexColors[0]);
  const firstChord = colorToChord(firstOklch);
  const keyRoot = firstChord.root.name;

  const diatonic = getChordsInKey(keyRoot, scale);
  const targetChords = preset.degrees.map(degree => diatonic[(degree - 1) % 7]);

  // Build a pool of { hex, rootSemitone } from the original palette
  const pool = hexColors.map(hex => {
    const oklch = hexToOklchApprox(hex);
    const chord = colorToChord(oklch);
    const rootSemitone = NOTE_NAMES.indexOf(chord.root.name);
    return { hex, oklch, rootSemitone };
  });

  const used = new Set<number>(); // indices into pool
  const steps: ColorMusicMapping[] = targetChords.map(target => {
    const targetSemitone = NOTE_NAMES.indexOf(target.root);

    // Find closest unused pool entry by semitone distance
    let bestIdx = -1;
    let bestDist = 999;
    for (let i = 0; i < pool.length; i++) {
      if (used.has(i)) continue;
      const dist = Math.min(
        Math.abs(pool[i].rootSemitone - targetSemitone),
        12 - Math.abs(pool[i].rootSemitone - targetSemitone)
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    let hex: string;
    let oklch: { l: number; c: number; h: number };

    if (bestIdx >= 0) {
      used.add(bestIdx);
      hex = pool[bestIdx].hex;
      oklch = pool[bestIdx].oklch;
    } else {
      // All pool entries used — generate colour from chord
      hex = chordToHex(target.root, target.quality);
      oklch = hexToOklchApprox(hex);
    }

    const chord = buildChordStep(target.root, 4, target.quality);
    return { hex, oklch, chord };
  });

  const key: KeySignature = {
    root: keyRoot,
    scale,
    label: `${keyRoot} ${scale}`,
  };

  return { tempo, steps, timeSignatureTop: 4, detectedKey: key };
}
