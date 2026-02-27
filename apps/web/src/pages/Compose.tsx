import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  paletteToComposition,
  buildChordStep,
  hexToOklchApprox,
  colorToChord,
  NOTE_NAMES,
  type NoteName,
  type ChordQuality,
  type Composition,
  type ColorMusicMapping,
} from '@kulrs/shared';
import { playComposition, stopPlayback } from '../audio/playback';
import { downloadMidi } from '../audio/midi-export';
import './Compose.css';

const CHORD_QUALITIES: ChordQuality[] = [
  'major',
  'minor',
  'diminished',
  'augmented',
  'sus2',
  'sus4',
  'dom7',
  'min7',
  'maj7',
];

const DEFAULT_COLORS = ['#E63946', '#457B9D', '#2A9D8F', '#E9C46A', '#F4A261'];

/**
 * Parse palette hex colours from the URL search params.
 * Accepts `?colors=FF5733,457B9D,...` (no # prefix) or `?palette=<json>`.
 */
function parseColorsFromParams(searchParams: URLSearchParams): string[] | null {
  const raw = searchParams.get('colors');
  if (raw) {
    return raw
      .split(',')
      .map(c => (c.startsWith('#') ? c : `#${c}`))
      .filter(c => /^#[0-9a-fA-F]{6}$/.test(c));
  }

  const json = searchParams.get('palette');
  if (json) {
    try {
      const parsed = JSON.parse(decodeURIComponent(json));
      if (Array.isArray(parsed?.colors)) {
        return parsed.colors.map((c: { hexValue: string }) => c.hexValue);
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

export function Compose() {
  const [searchParams] = useSearchParams();
  const [composition, setComposition] = useState<Composition | null>(null);
  const [hexColors, setHexColors] = useState<string[]>([]);
  const [tempo, setTempo] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Initialise from URL or defaults
  useEffect(() => {
    const fromUrl = parseColorsFromParams(searchParams);
    const colors = fromUrl && fromUrl.length > 0 ? fromUrl : DEFAULT_COLORS;
    setHexColors(colors);
    setComposition(paletteToComposition(colors, tempo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute when tempo changes
  useEffect(() => {
    if (hexColors.length > 0) {
      setComposition(prev => (prev ? { ...prev, tempo } : null));
    }
  }, [tempo, hexColors]);

  // ── Colour editing ─────────────────────────────────────────────────────

  const updateColor = useCallback((index: number, newHex: string) => {
    setHexColors(prev => {
      const next = [...prev];
      next[index] = newHex;
      return next;
    });
    setComposition(prev => {
      if (!prev) return prev;
      const steps = [...prev.steps];
      const oklch = hexToOklchApprox(newHex);
      const chord = colorToChord(oklch);
      steps[index] = { hex: newHex, oklch, chord };
      return { ...prev, steps };
    });
  }, []);

  const addColor = useCallback(() => {
    const newHex = `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
      .toUpperCase()}`;
    setHexColors(prev => [...prev, newHex]);
    setComposition(prev => {
      if (!prev) return prev;
      const oklch = hexToOklchApprox(newHex);
      const chord = colorToChord(oklch);
      return { ...prev, steps: [...prev.steps, { hex: newHex, oklch, chord }] };
    });
  }, []);

  const removeColor = useCallback(
    (index: number) => {
      if (hexColors.length <= 2) return; // need at least 2
      setHexColors(prev => prev.filter((_, i) => i !== index));
      setComposition(prev => {
        if (!prev) return prev;
        return { ...prev, steps: prev.steps.filter((_, i) => i !== index) };
      });
    },
    [hexColors.length]
  );

  // ── Chord editing ──────────────────────────────────────────────────────

  const updateChord = useCallback(
    (
      index: number,
      rootName: NoteName,
      octave: number,
      quality: ChordQuality
    ) => {
      setComposition(prev => {
        if (!prev) return prev;
        const steps = [...prev.steps];
        const oldStep = steps[index];
        const newChord = buildChordStep(rootName, octave, quality);
        steps[index] = { ...oldStep, chord: newChord };
        return { ...prev, steps };
      });
    },
    []
  );

  const updateBeats = useCallback((index: number, beats: number) => {
    setComposition(prev => {
      if (!prev) return prev;
      const steps = [...prev.steps];
      steps[index] = {
        ...steps[index],
        chord: { ...steps[index].chord, beats },
      };
      return { ...prev, steps };
    });
  }, []);

  // ── Playback ───────────────────────────────────────────────────────────

  const handlePlay = async () => {
    if (!composition) return;
    if (playing) {
      stopPlayback();
      setPlaying(false);
      setActiveStep(-1);
      return;
    }
    setPlaying(true);
    setActiveStep(0);
    await playComposition(composition, {
      onStep: i => {
        setActiveStep(i);
        stepsRef.current[i]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      },
      onEnd: () => {
        setPlaying(false);
        setActiveStep(-1);
      },
    });
    setPlaying(false);
    setActiveStep(-1);
  };

  // ── MIDI export ────────────────────────────────────────────────────────

  const handleExport = () => {
    if (!composition) return;
    downloadMidi(composition);
  };

  // ── Render ─────────────────────────────────────────────────────────────

  if (!composition) return null;

  return (
    <div className="compose-page">
      <div className="compose-header">
        <h1>
          <i className="fa-solid fa-music" /> Compose
        </h1>
        <p className="compose-subtitle">
          Each colour maps to a chord — hue sets the root note, lightness the
          octave, and saturation the chord quality. Tweak colours or chords,
          then play or export as MIDI.
        </p>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="compose-toolbar">
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${playing ? 'playing' : ''}`}
            onClick={handlePlay}
          >
            <i className={`fa-solid fa-${playing ? 'stop' : 'play'}`} />
            {playing ? 'Stop' : 'Play'}
          </button>
          <button className="toolbar-btn" onClick={handleExport}>
            <i className="fa-solid fa-download" /> Export MIDI
          </button>
          <button className="toolbar-btn" onClick={addColor}>
            <i className="fa-solid fa-plus" /> Add Step
          </button>
        </div>

        <div className="toolbar-group">
          <label className="tempo-label">
            <i className="fa-solid fa-gauge-high" />
            <input
              type="range"
              min={40}
              max={200}
              value={tempo}
              onChange={e => setTempo(Number(e.target.value))}
            />
            <span className="tempo-value">{tempo} BPM</span>
          </label>
        </div>
      </div>

      {/* ── Colour bar overview ───────────────────────────────────── */}
      <div className="colour-bar">
        {hexColors.map((hex, i) => (
          <div
            key={i}
            className={`colour-bar-swatch ${activeStep === i ? 'active' : ''}`}
            style={{ backgroundColor: hex }}
            title={`${hex} → ${composition.steps[i]?.chord.label}`}
          />
        ))}
      </div>

      {/* ── Step cards ────────────────────────────────────────────── */}
      <div className="step-list">
        {composition.steps.map((step, i) => (
          <StepCard
            key={i}
            index={i}
            step={step}
            active={activeStep === i}
            canRemove={composition.steps.length > 2}
            onColorChange={hex => updateColor(i, hex)}
            onChordChange={(root, oct, qual) => updateChord(i, root, oct, qual)}
            onBeatsChange={b => updateBeats(i, b)}
            onRemove={() => removeColor(i)}
            ref={el => {
              stepsRef.current[i] = el;
            }}
          />
        ))}
      </div>

      {/* ── Back link ─────────────────────────────────────────────── */}
      <div className="compose-footer">
        <Link to="/" className="back-link">
          <i className="fa-solid fa-arrow-left" /> Back to Generator
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step Card component
// ═══════════════════════════════════════════════════════════════════════════

import { forwardRef } from 'react';

interface StepCardProps {
  index: number;
  step: ColorMusicMapping;
  active: boolean;
  canRemove: boolean;
  onColorChange: (hex: string) => void;
  onChordChange: (
    root: NoteName,
    octave: number,
    quality: ChordQuality
  ) => void;
  onBeatsChange: (beats: number) => void;
  onRemove: () => void;
}

const StepCard = forwardRef<HTMLDivElement, StepCardProps>(function StepCard(
  {
    index,
    step,
    active,
    canRemove,
    onColorChange,
    onChordChange,
    onBeatsChange,
    onRemove,
  },
  ref
) {
  const { chord, hex } = step;

  return (
    <div ref={ref} className={`step-card ${active ? 'active' : ''}`}>
      {/* Colour column */}
      <div className="step-colour" style={{ backgroundColor: hex }}>
        <span className="step-number">{index + 1}</span>
        <input
          type="color"
          value={hex}
          onChange={e => onColorChange(e.target.value.toUpperCase())}
          className="colour-picker-input"
          title="Change colour"
        />
      </div>

      {/* Music details */}
      <div className="step-details">
        <div className="step-chord-label">{chord.label}</div>

        <div className="step-controls">
          {/* Root note */}
          <label className="step-field">
            <span>Root</span>
            <select
              value={chord.root.name}
              onChange={e =>
                onChordChange(
                  e.target.value as NoteName,
                  chord.root.octave,
                  chord.quality
                )
              }
            >
              {NOTE_NAMES.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          {/* Octave */}
          <label className="step-field">
            <span>Oct</span>
            <select
              value={chord.root.octave}
              onChange={e =>
                onChordChange(
                  chord.root.name,
                  Number(e.target.value),
                  chord.quality
                )
              }
            >
              {[2, 3, 4, 5, 6].map(o => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          {/* Quality */}
          <label className="step-field">
            <span>Type</span>
            <select
              value={chord.quality}
              onChange={e =>
                onChordChange(
                  chord.root.name,
                  chord.root.octave,
                  e.target.value as ChordQuality
                )
              }
            >
              {CHORD_QUALITIES.map(q => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </label>

          {/* Beats */}
          <label className="step-field">
            <span>Beats</span>
            <select
              value={chord.beats}
              onChange={e => onBeatsChange(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 6, 8].map(b => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="step-meta">
          <span className="hex-label">{hex}</span>
          <span className="melody-label">
            melody: {chord.melodyNote.name}
            {chord.melodyNote.octave}
          </span>
        </div>
      </div>

      {/* Remove button */}
      {canRemove && (
        <button
          className="step-remove"
          onClick={onRemove}
          title="Remove this step"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      )}
    </div>
  );
});
