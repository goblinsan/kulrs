import { useState, useEffect, useCallback, useRef, forwardRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  buildChordStep,
  hexToOklchApprox,
  colorToChord,
  NOTE_NAMES,
  type NoteName,
  type ChordQuality,
  type Composition,
  type ColorMusicMapping,
  type ScaleType,
  type KeySignature,
  type ChordSuggestion,
  type ProgressionPreset,
  PROGRESSION_PRESETS,
  paletteToHarmonicComposition,
  progressionToComposition,
  detectKey,
  suggestAlternatives,
  chordToHex,
  applyPresetToPalette,
} from '@kulrs/shared';
import { playComposition, stopPlayback } from '../audio/playback';
import { downloadMidi } from '../audio/midi-export';
import {
  createPalette as createPaletteApi,
  type CreatePaletteRequest,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Compose.css';

type ComposeMode = 'palette' | 'chords';

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

const SCALE_TYPES: { value: ScaleType; label: string }[] = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'dorian', label: 'Dorian' },
  { value: 'mixolydian', label: 'Mixolydian' },
];

const DEFAULT_COLORS = ['#E63946', '#457B9D', '#2A9D8F', '#E9C46A', '#F4A261'];

/**
 * Parse palette hex colors from the URL search params.
 * Accepts `?colors=FF5733,457B9D,...` (no # prefix) or `?palette=<json>`.
 * Falls back to sessionStorage (set by Home page) so the nav-bar
 * "Compose" link carries the current palette even without URL params.
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

  // Fallback: read from sessionStorage (written by Home page)
  try {
    const stored = sessionStorage.getItem('kulrs_palette_colors');
    if (stored) {
      const colors = JSON.parse(stored) as string[];
      if (Array.isArray(colors) && colors.length > 0) {
        return colors.filter(c => /^#[0-9a-fA-F]{6}$/i.test(c));
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

export function Compose() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<ComposeMode>('palette');
  const [composition, setComposition] = useState<Composition | null>(null);
  const [hexColors, setHexColors] = useState<string[]>([]);
  const [tempo, setTempo] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [detectedKey, setDetectedKey] = useState<KeySignature | null>(null);
  const [selectedKey, setSelectedKey] = useState<NoteName>('C');
  const [selectedScale, setSelectedScale] = useState<ScaleType>('major');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [originalColors, setOriginalColors] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);
  const userScrolledRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Detect manual scrolling to suppress auto-scroll during playback
  useEffect(() => {
    const onScroll = () => {
      userScrolledRef.current = true;
      // Reset after 4s of no scrolling so auto-scroll can resume
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        userScrolledRef.current = false;
      }, 4000);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Initialise from URL or defaults
  useEffect(() => {
    const fromUrl = parseColorsFromParams(searchParams);
    const colors = fromUrl && fromUrl.length > 0 ? fromUrl : DEFAULT_COLORS;
    setHexColors(colors);
    setOriginalColors(colors);
    const result = paletteToHarmonicComposition(colors, tempo);
    setComposition(result);
    setDetectedKey(result.detectedKey);
    // Sync key/scale selectors with detected key
    if (result.detectedKey) {
      setSelectedKey(result.detectedKey.root);
      setSelectedScale(result.detectedKey.scale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute when tempo changes
  useEffect(() => {
    if (hexColors.length > 0) {
      setComposition(prev => (prev ? { ...prev, tempo } : null));
    }
  }, [tempo, hexColors]);

  // ── Mode switching ─────────────────────────────────────────────────────

  const switchMode = useCallback(
    (newMode: ComposeMode) => {
      setMode(newMode);
      if (newMode === 'palette' && hexColors.length > 0) {
        const result = paletteToHarmonicComposition(hexColors, tempo);
        setComposition(result);
        setDetectedKey(result.detectedKey);
      }
    },
    [hexColors, tempo]
  );

  // ── Progression presets ─────────────────────────────────────────────────

  const loadPreset = useCallback(
    (presetIndex: number) => {
      const preset = PROGRESSION_PRESETS[presetIndex];
      if (!preset) return;

      setSelectedPreset(presetIndex);

      if (mode === 'palette') {
        // In palette mode, map the preset onto existing palette colors
        const sourceColors =
          originalColors.length > 0 ? originalColors : hexColors;
        const result = applyPresetToPalette(
          sourceColors,
          preset,
          selectedScale,
          tempo
        );
        setComposition(result);
        setHexColors(result.steps.map(s => s.hex));
        setDetectedKey(result.detectedKey);
        setSelectedKey(result.detectedKey.root);
        setSelectedScale(result.detectedKey.scale);
      } else {
        // In chords mode, replace everything with chord-derived colors
        const comp = progressionToComposition(
          selectedKey,
          selectedScale,
          preset,
          4,
          tempo
        );
        setComposition(comp);
        setHexColors(comp.steps.map(s => s.hex));
        setDetectedKey({
          root: selectedKey,
          scale: selectedScale,
          label: `${selectedKey} ${selectedScale}`,
        });
      }
    },
    [mode, selectedKey, selectedScale, tempo, hexColors, originalColors]
  );

  // ── Color editing ─────────────────────────────────────────────────────

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
      const newComp = { ...prev, steps };
      return newComp;
    });
  }, []);

  // Re-detect key whenever composition changes meaningfully
  const redetectKey = useCallback((comp: Composition) => {
    const key = detectKey(comp.steps.map(s => s.chord));
    setDetectedKey(key);
  }, []);

  const addColor = useCallback(() => {
    if (!composition) return;

    // Determine the base pattern length
    const baseLen = selectedPreset !== null
      ? PROGRESSION_PRESETS[selectedPreset].degrees.length
      : (originalColors.length || composition.steps.length);

    // Clone the step at the cycling position in the base pattern
    const currentLen = composition.steps.length;
    const sourceIdx = currentLen % baseLen;
    const sourceStep = composition.steps[Math.min(sourceIdx, composition.steps.length - 1)];

    const newHex = sourceStep.hex;
    setHexColors(prev => [...prev, newHex]);
    setComposition(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: [...prev.steps, { ...sourceStep }],
      };
    });
  }, [composition, selectedPreset, originalColors.length]);

  const removeColor = useCallback(
    (index: number) => {
      if (hexColors.length <= 2) return;
      setHexColors(prev => prev.filter((_, i) => i !== index));
      setComposition(prev => {
        if (!prev) return prev;
        const newComp = {
          ...prev,
          steps: prev.steps.filter((_, i) => i !== index),
        };
        redetectKey(newComp);
        return newComp;
      });
    },
    [hexColors.length, redetectKey]
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
        // In chords mode, also update the color to match the chord
        const newHex =
          mode === 'chords' ? chordToHex(rootName, quality) : oldStep.hex;
        const oklch = hexToOklchApprox(newHex);
        steps[index] = { hex: newHex, oklch, chord: newChord };
        const newComp = { ...prev, steps };
        redetectKey(newComp);
        if (mode === 'chords') {
          setHexColors(prevH => {
            const n = [...prevH];
            n[index] = newHex;
            return n;
          });
        }
        return newComp;
      });
    },
    [mode, redetectKey]
  );

  const applySuggestion = useCallback(
    (index: number, suggestion: ChordSuggestion) => {
      if (!composition) return;
      const oldStep = composition.steps[index];
      updateChord(
        index,
        suggestion.root,
        oldStep.chord.root.octave,
        suggestion.quality
      );
    },
    [composition, updateChord]
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

  // ── Section builders (Chorus / Bridge / Key Change) ────────────────────

  const BRIDGE_DEGREES: ProgressionPreset = {
    name: 'Bridge',
    degrees: [6, 4, 1, 5],
    description: 'Classic bridge: vi–IV–I–V',
  };

  const addSection = useCallback(
    (sectionSteps: ColorMusicMapping[]) => {
      const newHexes = sectionSteps.map(s => s.hex);
      setHexColors(prev => [...prev, ...newHexes]);
      setComposition(prev => {
        if (!prev) return prev;
        const newComp = { ...prev, steps: [...prev.steps, ...sectionSteps] };
        redetectKey(newComp);
        return newComp;
      });
    },
    [redetectKey]
  );

  const handleAddChorus = useCallback(() => {
    if (!composition) return;
    // Repeat the base pattern (the core progression)
    const baseLen = selectedPreset !== null
      ? PROGRESSION_PRESETS[selectedPreset].degrees.length
      : (originalColors.length || composition.steps.length);
    const baseSteps = composition.steps.slice(0, baseLen);
    addSection(baseSteps);
  }, [composition, selectedPreset, originalColors.length, addSection]);

  const handleAddBridge = useCallback(() => {
    if (!composition || !detectedKey) return;
    const bridgeComp = progressionToComposition(
      detectedKey.root,
      detectedKey.scale,
      BRIDGE_DEGREES,
      4,
      tempo
    );
    addSection(bridgeComp.steps);
  }, [composition, detectedKey, tempo, addSection]);

  const handleKeyChange = useCallback(() => {
    if (!composition || !detectedKey) return;
    const shift = 2; // whole step up
    const newRootIdx = (NOTE_NAMES.indexOf(detectedKey.root) + shift) % 12;
    const newRoot = NOTE_NAMES[newRootIdx];

    // Transpose the base pattern into the new key
    const baseLen = selectedPreset !== null
      ? PROGRESSION_PRESETS[selectedPreset].degrees.length
      : (originalColors.length || composition.steps.length);
    const baseSteps = composition.steps.slice(0, baseLen);

    const transposed: ColorMusicMapping[] = baseSteps.map(step => {
      const rootIdx = NOTE_NAMES.indexOf(step.chord.root.name);
      const newNoteRoot = NOTE_NAMES[(rootIdx + shift) % 12];
      const newChord = buildChordStep(
        newNoteRoot,
        step.chord.root.octave,
        step.chord.quality,
        step.chord.velocity,
        step.chord.beats
      );
      const newHex = chordToHex(newNoteRoot, step.chord.quality);
      const oklch = hexToOklchApprox(newHex);
      return { hex: newHex, oklch, chord: newChord };
    });

    const newHexes = transposed.map(s => s.hex);
    setHexColors(prev => [...prev, ...newHexes]);
    setComposition(prev => {
      if (!prev) return prev;
      return { ...prev, steps: [...prev.steps, ...transposed] };
    });

    // Update key to the new transposed key
    const newKey: KeySignature = {
      root: newRoot as NoteName,
      scale: detectedKey.scale,
      label: `${newRoot} ${detectedKey.scale}`,
    };
    setDetectedKey(newKey);
    setSelectedKey(newRoot as NoteName);
  }, [composition, detectedKey, selectedPreset, originalColors.length, tempo]);

  // ── Harmonize all ──────────────────────────────────────────────────────

  const harmonizeAll = useCallback(() => {
    if (hexColors.length === 0) return;
    const result = paletteToHarmonicComposition(hexColors, tempo);
    setComposition(result);
    setDetectedKey(result.detectedKey);
  }, [hexColors, tempo]);

  // ── Playback ───────────────────────────────────────────────────────────

  const handlePlay = async () => {
    if (!composition) return;
    if (playing) {
      stopPlayback();
      setPlaying(false);
      setActiveStep(-1);
      return;
    }
    userScrolledRef.current = false;
    setPlaying(true);
    setActiveStep(0);
    await playComposition(composition, {
      onStep: i => {
        setActiveStep(i);
        if (!userScrolledRef.current) {
          stepsRef.current[i]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      },
      onEnd: () => {
        setPlaying(false);
        setActiveStep(-1);
      },
    });
    setPlaying(false);
    setActiveStep(-1);
  };

  const handlePlayFrom = async (stepIndex: number) => {
    if (!composition) return;
    // If already playing, stop first
    if (playing) {
      stopPlayback();
      setPlaying(false);
      setActiveStep(-1);
      // Small delay so the audio context can close cleanly
      await new Promise(r => setTimeout(r, 50));
    }
    userScrolledRef.current = false;
    setPlaying(true);
    setActiveStep(stepIndex);
    await playComposition(
      composition,
      {
        onStep: i => {
          setActiveStep(i);
          if (!userScrolledRef.current) {
            stepsRef.current[i]?.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
            });
          }
        },
        onEnd: () => {
          setPlaying(false);
          setActiveStep(-1);
        },
      },
      stepIndex
    );
    setPlaying(false);
    setActiveStep(-1);
  };

  // ── MIDI export ────────────────────────────────────────────────────────

  const handleExport = () => {
    if (!composition) return;
    downloadMidi(composition);
  };

  // ── Save palette ───────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!composition || saving) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      const ROLES = [
        'primary',
        'secondary',
        'accent',
        'background',
        'text',
        'error',
        'warning',
        'success',
        'info',
      ];
      const request: CreatePaletteRequest = {
        palette: {
          colors: composition.steps.map((step, i) => ({
            role: ROLES[i % ROLES.length],
            color: step.oklch,
          })),
          metadata: {
            generator: 'compose',
            explanation: detectedKey
              ? `Composed in ${detectedKey.label}`
              : 'Composed palette',
            timestamp: new Date().toISOString(),
          },
        },
        name: detectedKey
          ? `Compose – ${detectedKey.label}`
          : 'Composed palette',
        description: detectedKey
          ? `Palette composed in ${detectedKey.label}`
          : 'Palette from the Compose tab',
        isPublic: true,
      };
      const response = await createPaletteApi(request);
      setSaveStatus(`Saved! ID: ${response.data.id}`);
    } catch (err) {
      console.error('Failed to save palette:', err);
      setSaveStatus(user ? 'Failed to save' : 'Log in to save palettes');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  // ── Navigate back with palette ─────────────────────────────────────────

  const handleBackToGenerator = () => {
    if (!composition) {
      navigate('/');
      return;
    }
    const ROLES = [
      'primary',
      'secondary',
      'accent',
      'background',
      'text',
      'error',
      'warning',
      'success',
      'info',
    ];
    navigate('/', {
      state: {
        paletteFromCompose: {
          colors: composition.steps.map((step, i) => ({
            role: ROLES[i % ROLES.length],
            color: step.oklch,
          })),
          metadata: {
            generator: 'compose',
            explanation: detectedKey
              ? `Composed in ${detectedKey.label}`
              : 'Composed palette',
            timestamp: new Date().toISOString(),
          },
        },
      },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────

  if (!composition) return null;

  return (
    <div className="compose-page">
      <div className="compose-header">
        <h1>
          <i className="fa-solid fa-music" /> Compose
        </h1>

        {/* Mode toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'palette' ? 'active' : ''}`}
            onClick={() => switchMode('palette')}
          >
            <i className="fa-solid fa-palette" /> Palette → Music
          </button>
          <button
            className={`mode-btn ${mode === 'chords' ? 'active' : ''}`}
            onClick={() => switchMode('chords')}
          >
            <i className="fa-solid fa-guitar" /> Chords → Palette
          </button>
        </div>

        <p className="compose-subtitle">
          {mode === 'palette'
            ? 'Colors are snapped to the nearest key so the progression sounds harmonious. Pick a preset to re-arrange your palette, or tweak colors and chords manually.'
            : 'Pick a key, choose a chord progression preset, and generate a color palette from the music.'}
        </p>

        {/* Key display */}
        {detectedKey && (
          <div className="key-badge">
            <i className="fa-solid fa-key" />
            {mode === 'palette' ? 'Detected key' : 'Key'}:{' '}
            <strong>{detectedKey.label}</strong>
            {mode === 'palette' && (
              <button className="harmonize-btn" onClick={harmonizeAll}>
                <i className="fa-solid fa-wand-magic-sparkles" /> Re-harmonize
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Key / Scale selectors & Chord progression presets ───── */}
      <div className="preset-panel">
        <div className="preset-key-select">
          <label className="step-field">
            <span>Key</span>
            <select
              value={selectedKey}
              onChange={e => setSelectedKey(e.target.value as NoteName)}
            >
              {NOTE_NAMES.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="step-field">
            <span>Scale</span>
            <select
              value={selectedScale}
              onChange={e => setSelectedScale(e.target.value as ScaleType)}
            >
              {SCALE_TYPES.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="preset-grid">
          {PROGRESSION_PRESETS.map((p, i) => (
            <button
              key={p.name}
              className={`preset-btn ${selectedPreset === i ? 'active' : ''}`}
              onClick={() => loadPreset(i)}
              title={p.description}
            >
              <span className="preset-name">{p.name}</span>
              <span className="preset-desc">{p.description}</span>
            </button>
          ))}
        </div>
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
          <button
            className={`toolbar-btn ${saveStatus ? 'saved' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            <i className="fa-solid fa-floppy-disk" />
            {saving ? 'Saving…' : 'Save Palette'}
          </button>
          <button className="toolbar-btn" onClick={addColor}>
            <i className="fa-solid fa-plus" /> Add Step
          </button>
        </div>

        <div className="toolbar-group section-group">
          <span className="section-label">Sections:</span>
          <button className="toolbar-btn section-btn" onClick={handleAddChorus} title="Repeat the core progression as a chorus">
            <i className="fa-solid fa-repeat" /> Chorus
          </button>
          <button className="toolbar-btn section-btn" onClick={handleAddBridge} title="Add a contrasting bridge section (vi–IV–I–V)">
            <i className="fa-solid fa-bridge" /> Bridge
          </button>
          <button className="toolbar-btn section-btn" onClick={handleKeyChange} title="Transpose the pattern up a whole step">
            <i className="fa-solid fa-arrow-up-right-dots" /> Key Change
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

      {/* ── Color bar overview ───────────────────────────────────── */}
      <div className="color-bar">
        {hexColors.map((hex, i) => (
          <div
            key={i}
            className={`color-bar-swatch ${activeStep === i ? 'active' : ''}`}
            style={{ backgroundColor: hex }}
            title={`Play from: ${hex} → ${composition.steps[i]?.chord.label}`}
            onClick={() => handlePlayFrom(i)}
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
            allChords={composition.steps.map(s => s.chord)}
            mode={mode}
            onColorChange={hex => updateColor(i, hex)}
            onChordChange={(root, oct, qual) => updateChord(i, root, oct, qual)}
            onBeatsChange={b => updateBeats(i, b)}
            onRemove={() => removeColor(i)}
            onApplySuggestion={s => applySuggestion(i, s)}
            onPlayFrom={() => handlePlayFrom(i)}
            ref={el => {
              stepsRef.current[i] = el;
            }}
          />
        ))}
      </div>

      {/* Save feedback */}
      {saveStatus && <div className="compose-save-feedback">{saveStatus}</div>}

      {/* ── Back link ─────────────────────────────────────────────── */}
      <div className="compose-footer">
        <button className="back-link" onClick={handleBackToGenerator}>
          <i className="fa-solid fa-arrow-left" /> Back to Generator
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step Card component
// ═══════════════════════════════════════════════════════════════════════════

import type { ChordStep } from '@kulrs/shared';

interface StepCardProps {
  index: number;
  step: ColorMusicMapping;
  active: boolean;
  canRemove: boolean;
  allChords: ChordStep[];
  mode: ComposeMode;
  onColorChange: (hex: string) => void;
  onChordChange: (
    root: NoteName,
    octave: number,
    quality: ChordQuality
  ) => void;
  onBeatsChange: (beats: number) => void;
  onRemove: () => void;
  onApplySuggestion: (s: ChordSuggestion) => void;
  onPlayFrom: () => void;
}

const StepCard = forwardRef<HTMLDivElement, StepCardProps>(function StepCard(
  {
    index,
    step,
    active,
    canRemove,
    allChords,
    mode,
    onColorChange,
    onChordChange,
    onBeatsChange,
    onRemove,
    onApplySuggestion,
    onPlayFrom,
  },
  ref
) {
  const { chord, hex } = step;
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = showSuggestions
    ? suggestAlternatives(chord, allChords)
    : [];

  return (
    <div ref={ref} className={`step-card ${active ? 'active' : ''}`}>
      {/* Color column */}
      <div
        className="step-color"
        style={{ backgroundColor: hex }}
        onClick={onPlayFrom}
        title={`Play from step ${index + 1}`}
      >
        <span className="step-number">{index + 1}</span>
        <span className="step-play-icon"><i className="fa-solid fa-play" /></span>
        {mode === 'palette' && (
          <input
            type="color"
            value={hex}
            onChange={e => onColorChange(e.target.value.toUpperCase())}
            className="color-picker-input"
            title="Change color"
          />
        )}
      </div>

      {/* Music details */}
      <div className="step-details">
        <div className="step-chord-row">
          <div className="step-chord-label">{chord.label}</div>
          <button
            className={`suggest-toggle ${showSuggestions ? 'open' : ''}`}
            onClick={() => setShowSuggestions(v => !v)}
            title="Show chord alternatives"
          >
            <i className="fa-solid fa-lightbulb" />
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-panel">
            {suggestions.map((s, si) => (
              <button
                key={si}
                className="suggestion-btn"
                onClick={() => {
                  onApplySuggestion(s);
                  setShowSuggestions(false);
                }}
                title={s.reason}
              >
                <span className="suggestion-label">{s.label}</span>
                <span className="suggestion-reason">{s.reason}</span>
              </button>
            ))}
          </div>
        )}

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
