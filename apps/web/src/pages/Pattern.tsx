import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  | 'dots'
  | 'crochet';

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
  { type: 'crochet', label: 'Crochet', icon: 'fa-solid fa-link' },
];

/** Pattern types that support gradient transitions. */
const GRADIENT_OK = new Set<PatternType>([
  'stripes-v',
  'stripes-h',
  'stripes-d',
  'concentric',
  'radial',
]);

/** Pattern types where per-color width weights apply. */
const WEIGHTS_OK = new Set<PatternType>([
  'stripes-v',
  'stripes-h',
  'stripes-d',
  'waves',
  'crochet',
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
  grad: boolean,
  weights?: number[]
) {
  const n = colors.length;
  const cycleW = sp * n;
  const wts = weights ?? colors.map(() => 1 / n);

  if (grad) {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    let pos = 0;
    let ci = 0;
    while (pos <= w) {
      g.addColorStop(Math.min(pos / w, 1), cc(colors, ci));
      pos += cycleW * wts[ci % n];
      ci++;
    }
    g.addColorStop(1, cc(colors, ci % n));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    let x = 0;
    let ci = 0;
    while (x < w) {
      const cw = cycleW * wts[ci % n];
      ctx.fillStyle = cc(colors, ci);
      ctx.fillRect(x, 0, cw + 0.5, h);
      x += cw;
      ci++;
    }
  }
}

function hStripes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number,
  grad: boolean,
  weights?: number[]
) {
  const n = colors.length;
  const cycleH = sp * n;
  const wts = weights ?? colors.map(() => 1 / n);

  if (grad) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    let pos = 0;
    let ci = 0;
    while (pos <= h) {
      g.addColorStop(Math.min(pos / h, 1), cc(colors, ci));
      pos += cycleH * wts[ci % n];
      ci++;
    }
    g.addColorStop(1, cc(colors, ci % n));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    let y = 0;
    let ci = 0;
    while (y < h) {
      const ch = cycleH * wts[ci % n];
      ctx.fillStyle = cc(colors, ci);
      ctx.fillRect(0, y, w, ch + 0.5);
      y += ch;
      ci++;
    }
  }
}

function dStripes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number,
  grad: boolean,
  weights?: number[]
) {
  const n = colors.length;
  const cycleW = sp * n;
  const wts = weights ?? colors.map(() => 1 / n);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 4);
  const d = Math.sqrt(w * w + h * h) * 1.5;
  if (grad) {
    const g = ctx.createLinearGradient(-d / 2, 0, d / 2, 0);
    let pos = 0;
    let ci = 0;
    while (pos <= d) {
      g.addColorStop(Math.min(pos / d, 1), cc(colors, ci));
      pos += cycleW * wts[ci % n];
      ci++;
    }
    g.addColorStop(1, cc(colors, ci % n));
    ctx.fillStyle = g;
    ctx.fillRect(-d / 2, -d / 2, d, d);
  } else {
    let x = -d / 2;
    let ci = 0;
    while (x < d / 2) {
      const cw = cycleW * wts[ci % n];
      ctx.fillStyle = cc(colors, ci);
      ctx.fillRect(x, -d / 2, cw + 0.5, d);
      x += cw;
      ci++;
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
  sp: number,
  _grad: boolean,
  weights?: number[]
) {
  const n = colors.length;
  const cycleH = sp * n;
  const wts = weights ?? colors.map(() => 1 / n);
  const amp = sp * 0.35;
  const waveLen = sp * 3;

  // Build band positions using weights
  const bands: { y: number; color: string }[] = [];
  let y = -sp * 3;
  let ci = 0;
  while (y < h + sp * 4) {
    bands.push({ y, color: cc(colors, ci) });
    y += cycleH * wts[ci % n];
    ci++;
  }

  // Draw top-to-bottom so lower bands cover upper ones
  for (let i = 0; i < bands.length; i++) {
    const baseY = bands[i].y;
    ctx.fillStyle = bands[i].color;
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

/* ── Crochet (cable braid) ────────────────────────────────────────────── */

function crochetDraw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  sp: number,
  _grad: boolean,
  weights?: number[]
) {
  const n = colors.length;
  const cycleW = sp * n;
  const wts = weights ?? colors.map(() => 1 / n);

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, h);

  const braidH = sp * 1.2;
  const halfBraid = braidH / 2;
  const rw = sp * 0.22;
  const amp = sp * 0.16;

  let colX = 0;
  let ci = 0;

  while (colX < w + sp) {
    const colW = cycleW * wts[ci % n];
    const color = colors[ci % n];
    const [r, g, b] = hexToRgb(color);
    const cx = colX + colW / 2;

    // Column background
    ctx.fillStyle = `rgb(${Math.max(0, r - 65)},${Math.max(0, g - 65)},${Math.max(0, b - 65)})`;
    ctx.fillRect(colX, 0, colW + 0.5, h);

    // Helper: draw strand path within a y range
    const strandSeg = (phase: number, yMin: number, yMax: number) => {
      ctx.beginPath();
      const pad = rw;
      for (let sy = yMin - pad; sy <= yMax + pad; sy += 1) {
        const angle = (sy / braidH) * Math.PI * 2 + phase;
        const px = cx + Math.sin(angle) * amp;
        if (sy <= yMin - pad + 1) ctx.moveTo(px, sy);
        else ctx.lineTo(px, sy);
      }
    };

    // Full strand path for shadow passes
    const fullStrand = (phase: number) => {
      ctx.beginPath();
      for (let sy = -braidH; sy <= h + braidH; sy += 2) {
        const angle = (sy / braidH) * Math.PI * 2 + phase;
        const px = cx + Math.sin(angle) * amp;
        if (sy <= -braidH + 2) ctx.moveTo(px, sy);
        else ctx.lineTo(px, sy);
      }
    };

    // Shadow pass: both strands in dark color
    const shadow = `rgb(${Math.max(0, r - 35)},${Math.max(0, g - 35)},${Math.max(0, b - 35)})`;
    ctx.strokeStyle = shadow;
    ctx.lineWidth = rw;
    ctx.lineCap = 'round';
    fullStrand(0);
    ctx.stroke();
    fullStrand(Math.PI);
    ctx.stroke();

    // Over-strand segments with clipping for proper crossover
    const segCount = Math.ceil((h + braidH * 4) / halfBraid);
    for (let seg = 0; seg < segCount; seg++) {
      const yStart = seg * halfBraid - braidH * 2;
      const overPhase = seg % 2 === 0 ? 0 : Math.PI;

      ctx.save();
      ctx.beginPath();
      ctx.rect(colX - 1, yStart, colW + 2, halfBraid);
      ctx.clip();

      // Main color
      ctx.strokeStyle = color;
      ctx.lineWidth = rw;
      ctx.lineCap = 'round';
      strandSeg(overPhase, yStart, yStart + halfBraid);
      ctx.stroke();

      // Highlight
      ctx.strokeStyle = `rgba(${Math.min(255, r + 50)},${Math.min(255, g + 50)},${Math.min(255, b + 50)},0.45)`;
      ctx.lineWidth = rw * 0.25;
      ctx.beginPath();
      const pad = rw;
      for (let sy = yStart - pad; sy <= yStart + halfBraid + pad; sy += 1) {
        const angle = (sy / braidH) * Math.PI * 2 + overPhase;
        const px = cx + Math.sin(angle) * amp - rw * 0.17;
        if (sy <= yStart - pad + 1) ctx.moveTo(px, sy);
        else ctx.lineTo(px, sy);
      }
      ctx.stroke();

      ctx.restore();
    }

    // Column separator
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(colX, 0);
    ctx.lineTo(colX, h);
    ctx.stroke();

    colX += colW;
    ci++;
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
  grad: boolean,
  weights?: number[]
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
  crochet: crochetDraw,
};

function renderPattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  pattern: PatternType,
  spacing: number,
  grad: boolean,
  weights?: number[],
  rotation = 0
) {
  if (colors.length === 0) return;
  ctx.clearRect(0, 0, w, h);

  if (rotation === 0) {
    DRAW[pattern](ctx, w, h, colors, spacing, grad, weights);
  } else {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    // Enlarged bounding box so rotated content covers the entire visible area
    const bw = w * cos + h * sin;
    const bh = w * sin + h * cos;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rad);
    ctx.translate(-bw / 2, -bh / 2);
    DRAW[pattern](ctx, bw, bh, colors, spacing, grad, weights);
    ctx.restore();
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export function Pattern() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const weightBarRef = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<string[]>(
    () => parseColorsFromParams(searchParams) ?? DEFAULT_COLORS
  );
  const [weights, setWeights] = useState<number[]>(() => {
    const n = (parseColorsFromParams(searchParams) ?? DEFAULT_COLORS).length;
    return Array(n).fill(1 / n) as number[];
  });
  const [patternType, setPatternType] = useState<PatternType>('stripes-v');
  const [spacing, setSpacing] = useState(80);
  const [transition, setTransition] = useState<TransitionMode>('distinct');
  const [canvasW, setCanvasW] = useState(600);
  const [draggingHandle, setDraggingHandle] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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
        transition === 'gradient',
        weights,
        rotation
      );
    });
    return () => cancelAnimationFrame(id);
  }, [colors, patternType, spacing, transition, canvasW, weights, rotation]);

  /* ── Handlers ─────────────────────────────────────────────────────── */

  const updateColor = useCallback((idx: number, hex: string) => {
    setColors(prev => prev.map((v, i) => (i === idx ? hex : v)));
  }, []);

  const removeColor = useCallback((idx: number) => {
    setColors(prev =>
      prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)
    );
    setWeights(prev => {
      if (prev.length <= 2) return prev;
      const next = prev.filter((_, i) => i !== idx);
      const sum = next.reduce((a, b) => a + b, 0);
      return next.map(v => v / sum);
    });
  }, []);

  const addColor = useCallback(() => {
    setColors(prev => [...prev, randomHex()]);
    setWeights(prev => {
      const share = 1 / (prev.length + 1);
      const scale = 1 - share;
      return [...prev.map(v => v * scale), share];
    });
  }, []);

  const handleReorder = useCallback((from: number, to: number) => {
    if (from === to) return;
    setColors(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setWeights(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const resetWeights = useCallback(() => {
    setWeights(Array(colors.length).fill(1 / colors.length) as number[]);
  }, [colors.length]);

  const handleWeightDrag = useCallback(
    (e: React.PointerEvent) => {
      if (draggingHandle == null) return;
      const bar = weightBarRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const relX = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width)
      );
      setWeights(prev => {
        const next = [...prev];
        let before = 0;
        for (let i = 0; i < draggingHandle; i++) before += next[i];
        let after = 0;
        for (let i = draggingHandle + 2; i < next.length; i++) after += next[i];
        const minW = 0.03;
        const available = Math.max(0, 1 - before - after);
        const leftW = Math.max(minW, Math.min(available - minW, relX - before));
        const rightW = available - leftW;
        next[draggingHandle] = leftW;
        next[draggingHandle + 1] = rightW;
        return next;
      });
    },
    [draggingHandle]
  );

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
      transition === 'gradient',
      weights,
      rotation
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
  }, [colors, patternType, spacing, transition, canvasW, weights, rotation]);

  const gradientEnabled = GRADIENT_OK.has(patternType);
  const weightsEnabled = WEIGHTS_OK.has(patternType);

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
            max={150}
            value={spacing}
            onChange={e => setSpacing(Number(e.target.value))}
          />
          <span className="ctrl-value">{spacing}px</span>
        </div>

        <div className="ctrl-row">
          <label>Rotation</label>
          <input
            type="range"
            min={0}
            max={360}
            value={rotation}
            onChange={e => setRotation(Number(e.target.value))}
          />
          <span className="ctrl-value">{rotation}°</span>
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

      {/* Color Widths */}
      {weightsEnabled && (
        <div className="pattern-weights">
          <div className="weights-head">
            <h3>Color Widths</h3>
            <button className="reset-weights-btn" onClick={resetWeights}>
              <i className="fa-solid fa-rotate-left" /> Reset
            </button>
          </div>
          <div
            className="weight-bar"
            ref={weightBarRef}
            onPointerMove={handleWeightDrag}
            onPointerUp={() => setDraggingHandle(null)}
            onLostPointerCapture={() => setDraggingHandle(null)}
          >
            {colors.map((hex, i) => (
              <Fragment key={i}>
                <div
                  className="weight-segment"
                  style={{ flex: weights[i], backgroundColor: hex }}
                />
                {i < colors.length - 1 && (
                  <div
                    className="weight-handle"
                    onPointerDown={e => {
                      e.preventDefault();
                      weightBarRef.current?.setPointerCapture(e.pointerId);
                      setDraggingHandle(i);
                    }}
                  />
                )}
              </Fragment>
            ))}
          </div>
        </div>
      )}

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
            <div
              key={i}
              className={`color-item${dragIdx === i ? ' dragging' : ''}${dragOverIdx === i ? ' drag-over' : ''}`}
              draggable
              onDragStart={e => {
                setDragIdx(i);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverIdx !== i) setDragOverIdx(i);
              }}
              onDragLeave={() => {
                if (dragOverIdx === i) setDragOverIdx(null);
              }}
              onDrop={e => {
                e.preventDefault();
                if (dragIdx != null) handleReorder(dragIdx, i);
                setDragIdx(null);
                setDragOverIdx(null);
              }}
              onDragEnd={() => {
                setDragIdx(null);
                setDragOverIdx(null);
              }}
            >
              <i className="fa-solid fa-grip-vertical color-drag-handle" />
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
        <button className="download-btn" onClick={() => navigate(`/compose?colors=${colors.map(c => c.replace('#', '')).join(',')}`)}
        >
          <i className="fa-solid fa-music" /> Compose
        </button>
        <button className="download-btn" onClick={() => navigate(`/scratch?colors=${colors.map(c => c.replace('#', '')).join(',')}`)}
        >
          <i className="fa-solid fa-pencil" /> Scratch
        </button>
        <button className="download-btn" onClick={() => navigate(`/design?colors=${colors.map(c => c.replace('#', '')).join(',')}`)}
        >
          <i className="fa-solid fa-palette" /> Design
        </button>
      </div>
    </div>
  );
}
