import { useMemo, useState } from 'react';
import {
  type GeneratedPalette,
  type OKLCHColor,
  oklchToRgb,
} from '@kulrs/shared';
import { oklchToHex } from './paletteUtils';
import './ColorExportTable.css';

interface ColorExportTableProps {
  palette: GeneratedPalette;
}

interface ColorValues {
  hex: string;
  rgb: { r: number; g: number; b: number };
  cmyk: { c: number; m: number; y: number; k: number };
  blenderHex: string;
}

/**
 * Convert RGB to CMYK
 * CMYK values are percentages (0-100)
 */
function rgbToCmyk(
  r: number,
  g: number,
  b: number
): { c: number; m: number; y: number; k: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const k = 1 - Math.max(rNorm, gNorm, bNorm);

  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = ((1 - rNorm - k) / (1 - k)) * 100;
  const m = ((1 - gNorm - k) / (1 - k)) * 100;
  const y = ((1 - bNorm - k) / (1 - k)) * 100;

  return {
    c: Math.round(c),
    m: Math.round(m),
    y: Math.round(y),
    k: Math.round(k * 100),
  };
}

/**
 * Convert sRGB to linear RGB (gamma correction)
 * This is what Blender expects for proper color representation
 */
function srgbToLinear(value: number): number {
  const normalized = value / 255;
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }
  return Math.pow((normalized + 0.055) / 1.055, 2.4);
}

/**
 * Convert linear RGB to hex for Blender
 * Blender uses linear color space, so we need to convert from sRGB
 */
function rgbToBlenderHex(r: number, g: number, b: number): string {
  // Convert to linear
  const linearR = srgbToLinear(r);
  const linearG = srgbToLinear(g);
  const linearB = srgbToLinear(b);

  // Convert back to 0-255 range for hex representation
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n * 255)))
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(linearR)}${toHex(linearG)}${toHex(linearB)}`.toUpperCase();
}

function getColorValues(color: OKLCHColor): ColorValues {
  const rgb = oklchToRgb(color);
  const hex = oklchToHex(color);
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  const blenderHex = rgbToBlenderHex(rgb.r, rgb.g, rgb.b);

  return { hex, rgb, cmyk, blenderHex };
}

export function ColorExportTable({ palette }: ColorExportTableProps) {
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const colorData = useMemo(() => {
    return palette.colors.map(c => ({
      role: c.role,
      color: c.color,
      values: getColorValues(c.color),
    }));
  }, [palette]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      setTimeout(() => setCopiedValue(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Role', 'Hex', 'RGB', 'CMYK', 'Blender Hex'];
    const rows = colorData.map(c => [
      c.role,
      c.values.hex,
      `rgb(${c.values.rgb.r}, ${c.values.rgb.g}, ${c.values.rgb.b})`,
      `cmyk(${c.values.cmyk.c}%, ${c.values.cmyk.m}%, ${c.values.cmyk.y}%, ${c.values.cmyk.k}%)`,
      c.values.blenderHex,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palette-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="color-export-table-container">
      <div className="export-header">
        <h3>Color Values</h3>
        <button onClick={handleExportCSV} className="export-csv-button">
          📥 Export CSV
        </button>
      </div>
      <div className="table-wrapper">
        <table className="color-export-table">
          <thead>
            <tr>
              <th className="swatch-col">Color</th>
              <th>Hex</th>
              <th>RGB</th>
              <th>CMYK</th>
              <th>
                Blender Hex
                <span
                  className="tooltip-icon"
                  title="Gamma-corrected for sRGB color space in Blender"
                >
                  ℹ️
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {colorData.map((c, index) => {
              const { l } = c.color;
              const textColor = l > 0.6 ? '#000' : '#fff';
              const cssColor = `oklch(${c.color.l} ${c.color.c} ${c.color.h})`;

              return (
                <tr key={index}>
                  <td className="swatch-cell">
                    <div
                      className="color-swatch"
                      style={{ backgroundColor: cssColor }}
                    >
                      <span
                        style={{ color: textColor }}
                        className="swatch-role"
                      >
                        {c.role}
                      </span>
                    </div>
                  </td>
                  <td
                    className="value-cell clickable"
                    onClick={() => handleCopy(c.values.hex)}
                    title="Click to copy"
                  >
                    <code>
                      {copiedValue === c.values.hex ? '✓ Copied' : c.values.hex}
                    </code>
                  </td>
                  <td
                    className="value-cell clickable"
                    onClick={() =>
                      handleCopy(
                        `rgb(${c.values.rgb.r}, ${c.values.rgb.g}, ${c.values.rgb.b})`
                      )
                    }
                    title="Click to copy"
                  >
                    <code>
                      {copiedValue ===
                      `rgb(${c.values.rgb.r}, ${c.values.rgb.g}, ${c.values.rgb.b})`
                        ? '✓ Copied'
                        : `rgb(${c.values.rgb.r}, ${c.values.rgb.g}, ${c.values.rgb.b})`}
                    </code>
                  </td>
                  <td
                    className="value-cell clickable"
                    onClick={() =>
                      handleCopy(
                        `cmyk(${c.values.cmyk.c}%, ${c.values.cmyk.m}%, ${c.values.cmyk.y}%, ${c.values.cmyk.k}%)`
                      )
                    }
                    title="Click to copy"
                  >
                    <code>
                      {copiedValue ===
                      `cmyk(${c.values.cmyk.c}%, ${c.values.cmyk.m}%, ${c.values.cmyk.y}%, ${c.values.cmyk.k}%)`
                        ? '✓ Copied'
                        : `${c.values.cmyk.c}/${c.values.cmyk.m}/${c.values.cmyk.y}/${c.values.cmyk.k}`}
                    </code>
                  </td>
                  <td
                    className="value-cell clickable"
                    onClick={() => handleCopy(c.values.blenderHex)}
                    title="Click to copy"
                  >
                    <code>
                      {copiedValue === c.values.blenderHex
                        ? '✓ Copied'
                        : c.values.blenderHex}
                    </code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
