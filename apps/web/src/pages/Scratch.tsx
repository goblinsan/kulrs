import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  rgbToOklch,
  oklchToRgb,
  generateAnalogous,
  generateComplementary,
  generateSplitComplementary,
  generateTriadic,
  type OKLCHColor,
} from '@kulrs/shared';
import { createPalette, type CreatePaletteRequest } from '../services/api';
import './Scratch.css';

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

function oklchToHex(c: OKLCHColor): string {
  const { r, g, b } = oklchToRgb(c);
  return rgbToHex(r, g, b);
}

function hexToOklch(hex: string): OKLCHColor {
  const { r, g, b } = hexToRgb(hex);
  return rgbToOklch({ r, g, b });
}

function randomHex(): string {
  return (
    '#' +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
  );
}

/** Clamp OKLCH lightness so the resulting hex is valid (not clamped to black/white). */
function safeOklchToHex(c: OKLCHColor): string {
  const clamped: OKLCHColor = {
    l: Math.max(0.05, Math.min(0.95, c.l)),
    c: Math.max(0, Math.min(0.37, c.c)),
    h: ((c.h % 360) + 360) % 360,
  };
  return oklchToHex(clamped);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Suggestion generators
   ═══════════════════════════════════════════════════════════════════════════ */

interface SuggestionGroup {
  label: string;
  icon: string;
  colors: string[];
}

function buildSuggestions(
  paletteHexes: string[],
  focusHex: string
): SuggestionGroup[] {
  const base = hexToOklch(focusHex);
  const existing = new Set(paletteHexes.map(h => h.toUpperCase()));

  const dedupe = (hexes: string[]): string[] =>
    hexes.filter(h => !existing.has(h.toUpperCase()));

  // Shades — vary lightness
  const shades: string[] = [];
  for (let lOff = -0.35; lOff <= 0.35; lOff += 0.07) {
    if (Math.abs(lOff) < 0.03) continue;
    shades.push(safeOklchToHex({ ...base, l: base.l + lOff }));
  }

  // Tints — same hue, lower chroma, varying lightness
  const tints: string[] = [];
  for (let i = 0; i < 8; i++) {
    const l = 0.3 + i * 0.08;
    const c = base.c * (0.15 + i * 0.1);
    tints.push(safeOklchToHex({ l, c: Math.min(c, 0.15), h: base.h }));
  }

  // Complementary
  const comp = generateComplementary(base);
  const compShades = [
    safeOklchToHex({ ...comp, l: comp.l - 0.15 }),
    safeOklchToHex(comp),
    safeOklchToHex({ ...comp, l: comp.l + 0.15 }),
  ];

  // Analogous
  const analogous = generateAnalogous(base, 30, 6).map(safeOklchToHex);

  // Triadic
  const triadic = generateTriadic(base).map(safeOklchToHex);
  const triadicWithShades = triadic.flatMap(hex => {
    const c = hexToOklch(hex);
    return [
      safeOklchToHex({ ...c, l: c.l - 0.12 }),
      hex,
      safeOklchToHex({ ...c, l: c.l + 0.12 }),
    ];
  });

  // Split-complementary
  const splitComp = generateSplitComplementary(base, 30).map(safeOklchToHex);
  const splitWithShades = splitComp.flatMap(hex => {
    const c = hexToOklch(hex);
    return [
      safeOklchToHex({ ...c, l: c.l - 0.12 }),
      hex,
      safeOklchToHex({ ...c, l: c.l + 0.12 }),
    ];
  });

  // Warm / cool accent
  const warmHue = (base.h + 40) % 360;
  const coolHue = (base.h - 40 + 360) % 360;
  const accents = [
    safeOklchToHex({ l: 0.65, c: base.c * 0.9, h: warmHue }),
    safeOklchToHex({ l: 0.55, c: base.c, h: warmHue }),
    safeOklchToHex({ l: 0.45, c: base.c * 0.9, h: warmHue }),
    safeOklchToHex({ l: 0.65, c: base.c * 0.9, h: coolHue }),
    safeOklchToHex({ l: 0.55, c: base.c, h: coolHue }),
    safeOklchToHex({ l: 0.45, c: base.c * 0.9, h: coolHue }),
  ];

  return [
    {
      label: 'Shades',
      icon: 'fa-solid fa-circle-half-stroke',
      colors: dedupe(shades),
    },
    { label: 'Tints', icon: 'fa-solid fa-droplet', colors: dedupe(tints) },
    {
      label: 'Complementary',
      icon: 'fa-solid fa-arrows-left-right',
      colors: dedupe(compShades),
    },
    {
      label: 'Analogous',
      icon: 'fa-solid fa-palette',
      colors: dedupe(analogous),
    },
    {
      label: 'Triadic',
      icon: 'fa-solid fa-draw-polygon',
      colors: dedupe(triadicWithShades),
    },
    {
      label: 'Split Complement',
      icon: 'fa-solid fa-code-branch',
      colors: dedupe(splitWithShades),
    },
    {
      label: 'Warm / Cool',
      icon: 'fa-solid fa-temperature-half',
      colors: dedupe(accents),
    },
  ].filter(g => g.colors.length > 0);
}

/** Perceived luminance for choosing label color. */
function luma(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

/** Generic role names for derived palette colors. */
const ROLE_NAMES = [
  'primary',
  'secondary',
  'accent',
  'info',
  'success',
  'warning',
  'error',
  'background',
];

/** Build a CreatePaletteRequest from an array of hex strings. */
function hexesToPaletteRequest(
  hexes: string[],
  name: string,
  explanation: string
): CreatePaletteRequest {
  return {
    palette: {
      colors: hexes.map((hex, i) => ({
        role: ROLE_NAMES[i % ROLE_NAMES.length],
        color: hexToOklch(hex),
      })),
      metadata: {
        generator: 'scratch-derived',
        explanation,
        timestamp: new Date().toISOString(),
      },
    },
    name,
    description: explanation,
    isPublic: true,
  };
}

export function Scratch() {
  const navigate = useNavigate();
  const [palette, setPalette] = useState<string[]>([]);
  const [manualColor, setManualColor] = useState('#6A5ACD');
  const [focusIdx, setFocusIdx] = useState(0); // which palette color drives suggestions
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [savedGroups, setSavedGroups] = useState<Record<string, string>>({}); // label → palette ID
  const [savingPalette, setSavingPalette] = useState(false);
  const [savedPaletteId, setSavedPaletteId] = useState<string | null>(null);

  /* Derived ──────────────────────────────────────────────────────────── */
  const focusHex = palette[focusIdx] ?? null;

  const suggestions = useMemo(
    () => (focusHex ? buildSuggestions(palette, focusHex) : []),
    [palette, focusHex]
  );

  /* Handlers ─────────────────────────────────────────────────────────── */

  const addColor = useCallback((hex: string) => {
    setPalette(prev => {
      const next = [...prev, hex.toUpperCase()];
      // Focus the newly added color so suggestions update
      setTimeout(() => setFocusIdx(next.length - 1), 0);
      return next;
    });
  }, []);

  const removeColor = useCallback(
    (idx: number) => {
      setPalette(prev => prev.filter((_, i) => i !== idx));
      setFocusIdx(prev => Math.max(0, Math.min(prev, palette.length - 2)));
    },
    [palette.length]
  );

  const updateColor = useCallback((idx: number, hex: string) => {
    setPalette(prev => prev.map((v, i) => (i === idx ? hex.toUpperCase() : v)));
  }, []);

  const handleStartColor = useCallback(
    (hex: string) => {
      addColor(hex);
    },
    [addColor]
  );

  const handleRandomNext = useCallback(() => {
    addColor(randomHex());
  }, [addColor]);

  const handleManualAdd = useCallback(() => {
    addColor(manualColor);
  }, [addColor, manualColor]);

  const clearPalette = useCallback(() => {
    setPalette([]);
    setFocusIdx(0);
    setSavedPaletteId(null);
    setSavedGroups({});
  }, []);

  /** Save a suggestion group (including the focused source color) as a palette. */
  const saveGroupAsPalette = useCallback(
    async (group: SuggestionGroup) => {
      if (savedGroups[group.label]) return; // already saved
      setSavingGroup(group.label);
      try {
        // Include the focused source color at position 0 so the palette makes sense on its own
        const allColors = focusHex ? [focusHex, ...group.colors] : group.colors;
        const name = `${group.label} — from ${focusHex ?? 'scratch'}`;
        const explanation = `${group.label} palette derived from ${focusHex ?? 'scratch'} via Start from Scratch.`;
        const req = hexesToPaletteRequest(allColors, name, explanation);
        const res = await createPalette(req);
        setSavedGroups(prev => ({ ...prev, [group.label]: res.data.id }));
      } catch (err) {
        console.error('Failed to save group palette:', err);
      } finally {
        setSavingGroup(null);
      }
    },
    [focusHex, savedGroups]
  );

  /** Save the user's built palette. */
  const saveBuiltPalette = useCallback(async () => {
    if (savedPaletteId || palette.length < 2) return;
    setSavingPalette(true);
    try {
      const name = `Scratch palette (${palette.length} colors)`;
      const explanation = `Custom palette built from scratch with ${palette.length} hand-picked colors.`;
      const req = hexesToPaletteRequest(palette, name, explanation);
      const res = await createPalette(req);
      setSavedPaletteId(res.data.id);
    } catch (err) {
      console.error('Failed to save palette:', err);
    } finally {
      setSavingPalette(false);
    }
  }, [palette, savedPaletteId]);

  const colorsParam = palette.map(h => h.replace('#', '')).join(',');

  const goToPattern = useCallback(() => {
    navigate(`/pattern?colors=${colorsParam}`);
  }, [navigate, colorsParam]);

  const goToCompose = useCallback(() => {
    navigate(`/compose?colors=${colorsParam}`);
  }, [navigate, colorsParam]);

  const copyHexes = useCallback(() => {
    navigator.clipboard.writeText(palette.join(', ')).catch(() => {});
  }, [palette]);

  /* ── Starter color presets ─────────────────────────────────────────── */
  const STARTER_PRESETS = [
    '#E63946',
    '#F4A261',
    '#E9C46A',
    '#2A9D8F',
    '#457B9D',
    '#6A5ACD',
    '#FF6B6B',
    '#4ECDC4',
    '#1A535C',
    '#FFE66D',
    '#A8DADC',
    '#264653',
    '#F72585',
    '#7209B7',
    '#3A0CA3',
    '#4361EE',
    '#4CC9F0',
    '#80FFDB',
    '#F77F00',
    '#D62828',
  ];

  /* ── JSX ───────────────────────────────────────────────────────────── */

  /* STEP 1: No colors yet — pick a starting color */
  if (palette.length === 0) {
    return (
      <div className="scratch-page">
        <div className="scratch-header">
          <h1>
            <i className="fa-solid fa-wand-magic-sparkles" /> Start from Scratch
          </h1>
          <p className="scratch-subtitle">
            Build a palette one color at a time. Pick your first color to get
            started.
          </p>
        </div>

        <div className="scratch-start">
          <div className="start-picker-row">
            <label
              className="start-swatch-large"
              style={{ backgroundColor: manualColor }}
            >
              <input
                type="color"
                value={manualColor}
                onChange={e => setManualColor(e.target.value)}
              />
            </label>
            <div className="start-picker-info">
              <span className="start-hex">{manualColor.toUpperCase()}</span>
              <button
                className="scratch-btn primary"
                onClick={() => handleStartColor(manualColor)}
              >
                <i className="fa-solid fa-play" /> Use This Color
              </button>
            </div>
          </div>

          <div className="start-divider">
            <span>or pick a preset</span>
          </div>

          <div className="preset-grid">
            {STARTER_PRESETS.map(hex => (
              <button
                key={hex}
                className="preset-swatch"
                style={{ backgroundColor: hex }}
                title={hex}
                onClick={() => handleStartColor(hex)}
              >
                <span
                  className="preset-label"
                  style={{ color: luma(hex) > 0.55 ? '#111' : '#fff' }}
                >
                  {hex}
                </span>
              </button>
            ))}
          </div>

          <div className="start-divider">
            <span>or go random</span>
          </div>

          <button
            className="scratch-btn secondary"
            onClick={() => handleStartColor(randomHex())}
          >
            <i className="fa-solid fa-dice" /> Random Starting Color
          </button>
        </div>
      </div>
    );
  }

  /* STEP 2: Palette building mode — show palette + suggestions */
  return (
    <div className="scratch-page">
      <div className="scratch-header">
        <h1>
          <i className="fa-solid fa-wand-magic-sparkles" /> Start from Scratch
        </h1>
        <p className="scratch-subtitle">
          Tap a suggestion to add it, or use the tools below. Click a palette
          color to base suggestions on it.
        </p>
      </div>

      {/* ── Built palette strip ─────────────────────────────────────── */}
      <div className="scratch-palette-strip">
        {palette.map((hex, i) => (
          <div
            key={i}
            className={`strip-swatch${focusIdx === i ? ' focused' : ''}`}
            style={{ backgroundColor: hex }}
            onClick={() => setFocusIdx(i)}
            title={`${hex} — click to base suggestions on this color`}
          >
            <span
              className="strip-label"
              style={{ color: luma(hex) > 0.55 ? '#111' : '#fff' }}
            >
              {hex}
            </span>
            <label
              className="strip-edit"
              style={{ color: luma(hex) > 0.55 ? '#333' : '#ddd' }}
              title="Edit color"
              onClick={e => e.stopPropagation()}
            >
              <i className="fa-solid fa-pen" />
              <input
                type="color"
                value={hex}
                onChange={e => updateColor(i, e.target.value)}
              />
            </label>
            <button
              className="strip-remove"
              style={{ color: luma(hex) > 0.55 ? '#333' : '#ddd' }}
              onClick={e => {
                e.stopPropagation();
                removeColor(i);
              }}
              title="Remove"
            >
              ×
            </button>
            {focusIdx === i && (
              <span
                className="strip-focus-badge"
                style={{ color: luma(hex) > 0.55 ? '#111' : '#fff' }}
              >
                <i className="fa-solid fa-crosshairs" />
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Suggestion groups ───────────────────────────────────────── */}
      <div className="scratch-suggestions">
        {suggestions.map(group => {
          const isSaving = savingGroup === group.label;
          const savedId = savedGroups[group.label];
          return (
            <div key={group.label} className="suggestion-group">
              <div className="suggestion-group-head">
                <h3 className="suggestion-group-label">
                  <i className={group.icon} /> {group.label}
                </h3>
                {savedId ? (
                  <button
                    className="save-group-btn saved"
                    onClick={() => navigate(`/palette/${savedId}`)}
                    title="View saved palette"
                  >
                    <i className="fa-solid fa-check" /> Saved
                  </button>
                ) : (
                  <button
                    className="save-group-btn"
                    disabled={isSaving}
                    onClick={() => saveGroupAsPalette(group)}
                    title="Save this set as its own palette"
                  >
                    <i
                      className={
                        isSaving
                          ? 'fa-solid fa-spinner fa-spin'
                          : 'fa-solid fa-floppy-disk'
                      }
                    />{' '}
                    {isSaving ? 'Saving…' : 'Save as Palette'}
                  </button>
                )}
              </div>
              <div className="suggestion-swatches">
                {group.colors.map((hex, i) => (
                  <button
                    key={`${hex}-${i}`}
                    className="suggestion-swatch"
                    style={{ backgroundColor: hex }}
                    title={`${hex} — click to add`}
                    onClick={() => addColor(hex)}
                  >
                    <span
                      className="swatch-label"
                      style={{ color: luma(hex) > 0.55 ? '#222' : '#fff' }}
                    >
                      {hex.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Manual / random row ─────────────────────────────────────── */}
      <div className="scratch-manual-row">
        <label
          className="manual-swatch"
          style={{ backgroundColor: manualColor }}
        >
          <input
            type="color"
            value={manualColor}
            onChange={e => setManualColor(e.target.value)}
          />
        </label>
        <span className="manual-hex">{manualColor.toUpperCase()}</span>
        <button className="scratch-btn small" onClick={handleManualAdd}>
          <i className="fa-solid fa-plus" /> Add Manual
        </button>
        <button
          className="scratch-btn small secondary"
          onClick={handleRandomNext}
        >
          <i className="fa-solid fa-dice" /> Random
        </button>
      </div>

      {/* ── Actions ─────────────────────────────────────────────────── */}
      {palette.length >= 2 && (
        <div className="scratch-actions">
          {savedPaletteId ? (
            <button
              className="scratch-btn saved"
              onClick={() => navigate(`/palette/${savedPaletteId}`)}
            >
              <i className="fa-solid fa-check" /> Saved — View Palette
            </button>
          ) : (
            <button
              className="scratch-btn primary"
              onClick={saveBuiltPalette}
              disabled={savingPalette}
            >
              <i
                className={
                  savingPalette
                    ? 'fa-solid fa-spinner fa-spin'
                    : 'fa-solid fa-floppy-disk'
                }
              />{' '}
              {savingPalette ? 'Saving…' : 'Save Palette'}
            </button>
          )}
          <button className="scratch-btn" onClick={goToPattern}>
            <i className="fa-solid fa-shapes" /> Open in Pattern
          </button>
          <button className="scratch-btn" onClick={goToCompose}>
            <i className="fa-solid fa-music" /> Open in Compose
          </button>
          <button className="scratch-btn secondary" onClick={copyHexes}>
            <i className="fa-solid fa-copy" /> Copy Hex Values
          </button>
          <button className="scratch-btn danger" onClick={clearPalette}>
            <i className="fa-solid fa-trash" /> Start Over
          </button>
        </div>
      )}
    </div>
  );
}
