import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Pattern.css';

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

type PatternType =
  | 'stripes-v'
  | 'stripes-h'
  | 'stripes-d'
  | 'checkerboard'
  | 'diamonds'
  | 'hexagons'
  | 'concentric'
  | 'radial'
  | 'stars'
  | 'woven'
  | 'waves'
  | 'dots';

type TransitionMode = 'distinct' | 'gradient';

/* ═══════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════════ */

const DEFAULT_COLORS = ['#E63946', '#457B9D', '#2A9D8F', '#E9C46A', '#F4A261'];

const PATTERN_OPTIONS: { type: PatternType; label: string; icon: string }[] = [
  {
    type: 'stripes-v',
    label: 'Vertical',
    icon: 'fa-solid fa-grip-lines-vertical',
  },
  { type: 'stripes-h', label: 'Horizontal', icon: 'fa-solid fa-grip-lines' },
  { type: 'stripes-d', label: 'Diagonal', icon: 'fa-solid fa-bars' },
  { type: 'checkerboard', label: 'Checker', icon: 'fa-solid fa-chess-board' },
  { type: 'diamonds', label: 'Diamond', icon: 'fa-solid fa-gem' },
  { type: 'hexagons', label: 'Hexagon', icon: 'fa-solid fa-draw-polygon' },
  { type: 'concentric', label: 'Rings', icon: 'fa-solid fa-bullseye' },
  { type: 'radial', label: 'Radial', icon: 'fa-solid fa-sun' },
  { type: 'stars', label: 'Stars', icon: 'fa-solid fa-star' },
  { type: 'woven', label: 'Woven', icon: 'fa-solid fa-table-cells' },
  { type: 'waves', label: 'Waves', icon: 'fa-solid fa-water' },
  { type: 'dots', label: 'Dots', icon: 'fa-solid fa-braille' },
];

/** Pattern types that support gradient transitions. */
const GRADIENT_OK = new Set<PatternType>([
  'stripes-v',
  'stripes-h',
  'stripes-d',
  'concentric',
  'radial',
]);

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.round(r * (1 - amount))},${Math.round(g * (1 - amount))},${Math.round(b * (1 - amount))})`;
}

/** Wrapping palette color accessor. */
function cc(colors: string[], i: number): string {
  return colors[((i % colors.length) + colors.length) % colors.length];
}

/**
 * Parse palette hex colors from URL or sessionStorage.
 * Accepts `?colors=FF5733,457B9D,...` (optional # prefix).
 * Falls back to sessionStorage so all nav links carry the palette.
 */
function parseColorsFromParams(sp: URLSearchParams): string[] | null {
  const raw = sp.get('colors');
  if (raw) {
    return raw
      .split(',')
      .map(v => (v.startsWith('#') ? v : `#${v}`))
      .filter(v => /^#[0-9a-fA-F]{6}$/.test(v));
  }
  try {
    const stored = sessionStorage.getItem('kulrs_palette_colors');
    if (stored) {
      const arr = JSON.parse(stored) as string[];
      if (Array.isArray(arr) && arr.length > 0)
        return arr.filter(v => /^#[0-9a-fA-F]{6}$/i.test(v));
    }
  } catch {
    /* ignore */
  }
  return null;
}

function randomHex(): string {
  return (
    '#' +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Drawing functions
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Stripes ──────────────────────────────────────────────────────────── */

function vStripes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number,
  grad: boolean
) {
  if (grad) {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    const n = Math.ceil(w / sp) + 1;
    for (let i = 0; i <= n; i++)
      g.addColorStop(Math.min((i * sp) / w, 1), cc(colors, i));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    for (let x = 0, i = 0; x < w; x += sp, i++) {
      ctx.fillStyle = cc(colors, i);
      ctx.fillRect(x, 0, sp, h);
    }
  }
}

function hStripes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number,
  grad: boolean
) {
  if (grad) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    const n = Math.ceil(h / sp) + 1;
    for (let i = 0; i <= n; i++)
      g.addColorStop(Math.min((i * sp) / h, 1), cc(colors, i));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    for (let y = 0, i = 0; y < h; y += sp, i++) {
      ctx.fillStyle = cc(colors, i);
      ctx.fillRect(0, y, w, sp);
    }
  }
}

function dStripes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number,
  grad: boolean
) {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 4);
  const d = Math.sqrt(w * w + h * h) * 1.5;
  if (grad) {
    const g = ctx.createLinearGradient(-d / 2, 0, d / 2, 0);
    const n = Math.ceil(d / sp) + 1;
    for (let i = 0; i <= n; i++)
      g.addColorStop(Math.min((i * sp) / d, 1), cc(colors, i));
    ctx.fillStyle = g;
    ctx.fillRect(-d / 2, -d / 2, d, d);
  } else {
    for (let x = -d / 2, i = 0; x < d / 2; x += sp, i++) {
      ctx.fillStyle = cc(colors, i);
      ctx.fillRect(x, -d / 2, sp, d);
    }
  }
  ctx.restore();
}

/* ── Tiling ───────────────────────────────────────────────────────────── */

function checker(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number
) {
  for (let y = 0, row = 0; y < h; y += sp, row++) {
    for (let x = 0, col = 0; x < w; x += sp, col++) {
      ctx.fillStyle = cc(colors, (row + col) % colors.length);
      ctx.fillRect(x, y, sp, sp);
    }
  }
}

function diamondsDraw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number
) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  const half = sp / 2;
  for (let cy = 0, row = 0; cy < h + sp; cy += half, row++) {
    const xOff = (row % 2) * half;
    for (let cx = xOff, col = 0; cx < w + sp; cx += sp, col++) {
      ctx.fillStyle = cc(colors, (row + col) % colors.length);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx + half, cy);
      ctx.lineTo(cx, cy + half);
      ctx.lineTo(cx - half, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

function hexagonsDraw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number
) {
  const r = sp / 2;
  const hexW = r * Math.sqrt(3);
  const rowH = r * 1.5;
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  for (let cy = 0, row = 0; cy < h + r * 2; cy += rowH, row++) {
    const xOff = (row % 2) * (hexW / 2);
    for (let cx = xOff, col = 0; cx < w + hexW; cx += hexW, col++) {
      ctx.fillStyle = cc(colors, (row * 3 + col) % colors.length);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

/* ── Circular ─────────────────────────────────────────────────────────── */

function ringsDraw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number,
  grad: boolean
) {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  if (grad) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    const n = Math.ceil(maxR / sp) + 1;
    for (let i = 0; i <= n; i++)
      g.addColorStop(Math.min((i * sp) / maxR, 1), cc(colors, i));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    for (let i = Math.ceil(maxR / sp); i >= 0; i--) {
      ctx.fillStyle = cc(colors, i);
      ctx.beginPath();
      ctx.arc(cx, cy, (i + 1) * sp, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function radialDraw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number,
  grad: boolean
) {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  // Spacing maps to sector count: lower spacing → more sectors
  const sectors = Math.max(
    colors.length,
    Math.round(360 / Math.max(sp / 2, 5))
  );
  const step = (Math.PI * 2) / sectors;

  if (grad) {
    const g = ctx.createConicGradient(0, cx, cy);
    for (let i = 0; i <= sectors; i++)
      g.addColorStop(Math.min(i / sectors, 1), cc(colors, i));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (let i = 0; i < sectors; i++) {
      ctx.fillStyle = cc(colors, i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, i * step, (i + 1) * step + 0.005);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/* ── Shapes ───────────────────────────────────────────────────────────── */

function starPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  pts: number
) {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = (Math.PI / pts) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function starsDraw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number
) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  const oR = sp * 0.4;
  const iR = oR * 0.4;
  for (let y = sp / 2, row = 0; y < h + sp; y += sp, row++) {
    const xOff = (row % 2) * (sp / 2);
    for (let x = sp / 2 + xOff, col = 0; x < w + sp; x += sp, col++) {
      ctx.fillStyle = cc(colors, (row + col) % colors.length);
      starPath(ctx, x, y, oR, iR, 5);
      ctx.fill();
    }
  }
}

/* ── Woven (basket weave) ─────────────────────────────────────────────── */

function wovenDraw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number
) {
  const bw = sp;
  const gap = Math.max(1, Math.round(sp * 0.08));
  const cell = bw + gap;
  const halfLen = Math.ceil(colors.length / 2);

  // Background (visible through gaps)
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, h);

  const rows = Math.ceil(h / cell) + 1;
  const cols = Math.ceil(w / cell) + 1;

  // Under pass — all bands drawn darkened
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = darken(cc(colors, r), 0.3);
    ctx.fillRect(0, r * cell, w, bw);
  }
  for (let cIdx = 0; cIdx < cols; cIdx++) {
    ctx.fillStyle = darken(cc(colors, cIdx + halfLen), 0.3);
    ctx.fillRect(cIdx * cell, 0, bw, h);
  }

  // Over pass — brighten the band that goes on top at each intersection
  for (let r = 0; r < rows; r++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      ctx.fillStyle =
        (r + cIdx) % 2 === 0
          ? cc(colors, r) // horizontal on top
          : cc(colors, cIdx + halfLen); // vertical on top
      ctx.fillRect(cIdx * cell, r * cell, bw, bw);
    }
  }
}

/* ── Waves ────────────────────────────────────────────────────────────── */

function wavesDraw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number
) {
  const amp = sp * 0.35;
  const waveLen = sp * 3;
  const totalBands = Math.ceil(h / sp) + colors.length + 4;
  // Draw bottom-up so upper waves cover lower
  for (let i = totalBands; i >= 0; i--) {
    const baseY = i * sp - sp * 3;
    ctx.fillStyle = cc(colors, i);
    ctx.beginPath();
    ctx.moveTo(0, h + 10);
    for (let x = 0; x <= w; x += 2) {
      ctx.lineTo(
        x,
        baseY + Math.sin((x / waveLen) * Math.PI * 2 + i * 0.8) * amp
      );
    }
    ctx.lineTo(w, h + 10);
    ctx.closePath();
    ctx.fill();
  }
}

/* ── Dots ─────────────────────────────────────────────────────────────── */

function dotsDraw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number
) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  const r = sp * 0.35;
  for (let y = sp / 2, row = 0; y < h + sp; y += sp, row++) {
    const xOff = (row % 2) * (sp / 2);
    for (let x = sp / 2 + xOff, col = 0; x < w + sp; x += sp, col++) {
      ctx.fillStyle = cc(colors, (row + col) % colors.length);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Render dispatcher
   ═══════════════════════════════════════════════════════════════════════════ */

type DrawFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  spacing: number,
  grad: boolean
) => void;

const DRAW: Record<PatternType, DrawFn> = {
  'stripes-v': vStripes,
  'stripes-h': hStripes,
  'stripes-d': dStripes,
  checkerboard: checker,
  diamonds: diamondsDraw,
  hexagons: hexagonsDraw,
  concentric: ringsDraw,
  radial: radialDraw,
  stars: starsDraw,
  woven: wovenDraw,
  waves: wavesDraw,
  dots: dotsDraw,
};

function renderPattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  pattern: PatternType,
  spacing: number,
  grad: boolean
) {
  if (colors.length === 0) return;
  ctx.clearRect(0, 0, w, h);
  DRAW[pattern](ctx, w, h, colors, spacing, grad);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export function Pattern() {
  const [searchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<string[]>(
    () => parseColorsFromParams(searchParams) ?? DEFAULT_COLORS
  );
  const [patternType, setPatternType] = useState<PatternType>('stripes-v');
  const [spacing, setSpacing] = useState(40);
  const [transition, setTransition] = useState<TransitionMode>('distinct');
  const [canvasW, setCanvasW] = useState(600);

  /* Keep sessionStorage in sync so other pages pick up the palette */
  useEffect(() => {
    try {
      sessionStorage.setItem('kulrs_palette_colors', JSON.stringify(colors));
    } catch {
      /* ignore */
    }
  }, [colors]);

  /* Track container width via ResizeObserver */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = Math.round(e.contentRect.width);
        if (w > 0) setCanvasW(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Render pattern on canvas */
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvasW;
      const h = w; // square
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderPattern(
        ctx,
        w,
        h,
        colors,
        patternType,
        spacing,
        transition === 'gradient'
      );
    });
    return () => cancelAnimationFrame(id);
  }, [colors, patternType, spacing, transition, canvasW]);

  /* ── Handlers ─────────────────────────────────────────────────────── */

  const updateColor = useCallback((idx: number, hex: string) => {
    setColors(prev => prev.map((v, i) => (i === idx ? hex : v)));
  }, []);

  const removeColor = useCallback((idx: number) => {
    setColors(prev =>
      prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)
    );
  }, []);

  const addColor = useCallback(() => {
    setColors(prev => [...prev, randomHex()]);
  }, []);

  const handleDownload = useCallback(() => {
    const size = 2048;
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;
    const scale = size / canvasW;
    renderPattern(
      ctx,
      size,
      size,
      colors,
      patternType,
      spacing * scale,
      transition === 'gradient'
    );
    offscreen.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kulrs-pattern-${patternType}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [colors, patternType, spacing, transition, canvasW]);

  const gradientEnabled = GRADIENT_OK.has(patternType);

  /* ── JSX ──────────────────────────────────────────────────────────── */

  return (
    <div className="pattern-page">
      {/* Header */}
      <div className="pattern-header">
        <h1>
          <i className="fa-solid fa-shapes" /> Pattern
        </h1>
        <p className="pattern-subtitle">
          Generate repeating patterns from your color palette
        </p>
      </div>

      {/* Pattern type selector */}
      <div className="pattern-type-grid">
        {PATTERN_OPTIONS.map(opt => (
          <button
            key={opt.type}
            className={`ptype-btn ${patternType === opt.type ? 'active' : ''}`}
            onClick={() => setPatternType(opt.type)}
            title={opt.label}
          >
            <i
              className={`${opt.icon}${opt.type === 'stripes-d' ? ' icon-rotate-45' : ''}`}
            />
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="pattern-canvas-wrap" ref={containerRef}>
        <canvas ref={canvasRef} />
      </div>

      {/* Controls */}
      <div className="pattern-controls">
        <div className="ctrl-row">
          <label>Spacing</label>
          <input
            type="range"
            min={10}
            max={120}
            value={spacing}
            onChange={e => setSpacing(Number(e.target.value))}
          />
          <span className="ctrl-value">{spacing}px</span>
        </div>

        <div className="ctrl-row">
          <label>Transition</label>
          <div className="toggle-group">
            <button
              className={`toggle-btn ${transition === 'distinct' ? 'active' : ''}`}
              onClick={() => setTransition('distinct')}
            >
              Distinct
            </button>
            <button
              className={`toggle-btn ${transition === 'gradient' ? 'active' : ''} ${!gradientEnabled ? 'disabled' : ''}`}
              onClick={() => gradientEnabled && setTransition('gradient')}
              disabled={!gradientEnabled}
              title={
                gradientEnabled
                  ? 'Smooth blending between colors'
                  : 'Gradient not available for this pattern type'
              }
            >
              Gradient
            </button>
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="pattern-colors">
        <div className="colors-head">
          <h3>Colors</h3>
          <button
            className="add-color-btn"
            onClick={addColor}
            title="Add a color"
          >
            <i className="fa-solid fa-plus" /> Add
          </button>
        </div>
        <div className="color-list">
          {colors.map((hex, i) => (
            <div key={i} className="color-item">
              <label className="color-swatch" style={{ backgroundColor: hex }}>
                <input
                  type="color"
                  value={hex}
                  onChange={e => updateColor(i, e.target.value)}
                />
              </label>
              <span className="color-hex">{hex.toUpperCase()}</span>
              <button
                className="color-remove"
                onClick={() => removeColor(i)}
                disabled={colors.length <= 2}
                title="Remove color"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="pattern-actions">
        <button className="download-btn" onClick={handleDownload}>
          <i className="fa-solid fa-download" /> Download PNG
        </button>
      </div>
    </div>
  );
}
