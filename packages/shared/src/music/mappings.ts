/**
 * Color-to-Music Mapping Engine
 *
 * Maps OKLCH colour properties to musical primitives:
 *
 *   Hue (0-360°)       → Root note  (12 semitones, 30° each)
 *   Lightness (0-1)     → Octave    (darker = lower, lighter = higher)
 *   Chroma   (0-0.4)    → Chord quality (high = major, mid = minor,
 *                                        low = diminished/suspended)
 *
 * A palette of N colours produces an N-step chord progression.
 * Each step also receives a single-note melody pitch derived from
 * the same colour, offset by the chord's third/fifth for interest.
 */

// ── Note & chord vocabulary ──────────────────────────────────────────────

export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export type NoteName = (typeof NOTE_NAMES)[number];

export type ChordQuality =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  | 'sus2'
  | 'sus4'
  | 'dom7'
  | 'min7'
  | 'maj7';

export interface MusicNote {
  /** e.g. "C", "F#" */
  name: NoteName;
  /** MIDI octave (2-6 typical) */
  octave: number;
  /** MIDI note number (0-127) */
  midi: number;
}

export interface ChordStep {
  /** Root note of the chord */
  root: MusicNote;
  /** Chord quality */
  quality: ChordQuality;
  /** All MIDI notes in the chord voicing */
  midiNotes: number[];
  /** Display label, e.g. "Am7" */
  label: string;
  /** Melody note for this step */
  melodyNote: MusicNote;
  /** Duration in beats (default 4 = one bar of 4/4) */
  beats: number;
  /** Velocity 0-127 */
  velocity: number;
}

export interface ColorMusicMapping {
  /** Original hex colour */
  hex: string;
  /** OKLCH components used for the mapping */
  oklch: { l: number; c: number; h: number };
  /** The resulting chord step */
  chord: ChordStep;
}

export interface Composition {
  /** BPM */
  tempo: number;
  /** Individual steps */
  steps: ColorMusicMapping[];
  /** Time signature numerator (denominator is always 4) */
  timeSignatureTop: number;
}

// ── Mapping helpers ──────────────────────────────────────────────────────

/** Map hue (0-360) to a semitone index (0-11). */
export function hueToSemitone(hue: number): number {
  const normalised = ((hue % 360) + 360) % 360;
  return Math.round((normalised / 360) * 12) % 12;
}

/** Map lightness (0-1) to an octave (2-6). */
export function lightnessToOctave(l: number): number {
  const clamped = Math.max(0, Math.min(1, l));
  return Math.round(2 + clamped * 4); // 2 … 6
}

/** Map chroma to a chord quality. */
export function chromaToQuality(c: number): ChordQuality {
  if (c >= 0.28) return 'major';
  if (c >= 0.22) return 'dom7';
  if (c >= 0.16) return 'minor';
  if (c >= 0.10) return 'min7';
  if (c >= 0.06) return 'sus4';
  if (c >= 0.03) return 'diminished';
  return 'sus2';
}

/** Map lightness to velocity (softer for very dark/light). */
export function lightnessToVelocity(l: number): number {
  // Bell-curve-ish: peaks at l≈0.55
  const v = 60 + Math.round(67 * (1 - Math.abs(l - 0.55) * 2));
  return Math.max(40, Math.min(127, v));
}

/** Semitone intervals from root for each chord quality. */
const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dom7: [0, 4, 7, 10],
  min7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
};

/** Suffix shown after root name. */
const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  major: '',
  minor: 'm',
  diminished: 'dim',
  augmented: 'aug',
  sus2: 'sus2',
  sus4: 'sus4',
  dom7: '7',
  min7: 'm7',
  maj7: 'maj7',
};

function midiToNote(midi: number): MusicNote {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { name, octave, midi };
}

function noteToMidi(name: NoteName, octave: number): number {
  const semitone = NOTE_NAMES.indexOf(name);
  return (octave + 1) * 12 + semitone;
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Derive a chord step from a single OKLCH colour.
 */
export function colorToChord(oklch: {
  l: number;
  c: number;
  h: number;
}): ChordStep {
  const semitone = hueToSemitone(oklch.h);
  const octave = lightnessToOctave(oklch.l);
  const quality = chromaToQuality(oklch.c);
  const velocity = lightnessToVelocity(oklch.l);

  const rootMidi = noteToMidi(NOTE_NAMES[semitone], octave);
  const root = midiToNote(rootMidi);

  const intervals = CHORD_INTERVALS[quality];
  const midiNotes = intervals.map((i) => rootMidi + i);

  const label = `${root.name}${QUALITY_SUFFIX[quality]}`;

  // Melody: pick a note a fifth (7 semitones) above root, one octave up
  const melodyMidi = Math.min(rootMidi + 12 + 7, 108);
  const melodyNote = midiToNote(melodyMidi);

  return {
    root,
    quality,
    midiNotes,
    label,
    melodyNote,
    beats: 4,
    velocity,
  };
}

/**
 * Convert hex → approximate OKLCH.
 * (Simplified — good enough for the mapping, not colour-accurate.)
 */
export function hexToOklchApprox(hex: string): {
  l: number;
  c: number;
  h: number;
} {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const toLinear = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  const x = 0.4124 * lr + 0.3576 * lg + 0.1805 * lb;
  const z = 0.0193 * lr + 0.1192 * lg + 0.9505 * lb;

  const labL = 116 * Math.cbrt(y) - 16;
  const a = 500 * (Math.cbrt(x / 0.95047) - Math.cbrt(y));
  const bLab = 200 * (Math.cbrt(y) - Math.cbrt(z / 1.08883));

  const l = Math.max(0, Math.min(1, labL / 100));
  const c = Math.sqrt(a * a + bLab * bLab) / 150;
  const h = ((Math.atan2(bLab, a) * 180) / Math.PI + 360) % 360;

  return { l, c, h };
}

/**
 * Derive a full composition from an array of hex colours.
 */
export function paletteToComposition(
  hexColors: string[],
  tempo = 100
): Composition {
  const steps: ColorMusicMapping[] = hexColors.map((hex) => {
    const oklch = hexToOklchApprox(hex);
    const chord = colorToChord(oklch);
    return { hex, oklch, chord };
  });

  return {
    tempo,
    steps,
    timeSignatureTop: 4,
  };
}

/**
 * Get the MIDI frequency for a MIDI note number (for Web Audio).
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Rebuild a chord step from an updated root note + quality
 * (used when the user edits a step manually).
 */
export function buildChordStep(
  rootName: NoteName,
  octave: number,
  quality: ChordQuality,
  velocity = 90,
  beats = 4
): ChordStep {
  const rootMidi = noteToMidi(rootName, octave);
  const root = midiToNote(rootMidi);
  const intervals = CHORD_INTERVALS[quality];
  const midiNotes = intervals.map((i) => rootMidi + i);
  const label = `${root.name}${QUALITY_SUFFIX[quality]}`;
  const melodyMidi = Math.min(rootMidi + 12 + 7, 108);
  const melodyNote = midiToNote(melodyMidi);
  return { root, quality, midiNotes, label, melodyNote, beats, velocity };
}
