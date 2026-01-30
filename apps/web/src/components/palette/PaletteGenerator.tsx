import { useState, useMemo } from 'react';
import {
  type GeneratedPalette,
  type OKLCHColor,
  oklchToRgb,
} from '@kulrs/shared';
import { MoodGenerator } from './MoodGenerator';
import { ColorGenerator } from './ColorGenerator';
import { ImageGenerator } from './ImageGenerator';
import { apiPost } from '../../services/api';
import './PaletteGenerator.css';

type GeneratorTab = 'mood' | 'color' | 'image';

interface PaletteGeneratorProps {
  onGenerate: (palette: GeneratedPalette) => void;
  palette?: GeneratedPalette | null;
}

interface GenerateResponse {
  success: boolean;
  data: GeneratedPalette;
}

const MAX_COLORS = 5;

// Convert OKLCH to hex string
function oklchToHex(oklch: OKLCHColor): string {
  const rgb = oklchToRgb(oklch);
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

export function PaletteGenerator({
  onGenerate,
  palette,
}: PaletteGeneratorProps) {
  const [activeTab, setActiveTab] = useState<GeneratorTab>('mood');
  const [loading, setLoading] = useState(false);

  // Derive colors from palette for ColorGenerator
  const paletteHexColors = useMemo(() => {
    if (!palette || palette.colors.length === 0) {
      return ['#646cff'];
    }
    return palette.colors.slice(0, MAX_COLORS).map(c => oklchToHex(c.color));
  }, [palette]);

  // Track the last palette timestamp to detect changes
  const [lastPaletteTimestamp, setLastPaletteTimestamp] = useState<
    string | null
  >(null);

  // State for ColorGenerator
  const [colorPickerColors, setColorPickerColors] =
    useState<string[]>(paletteHexColors);
  const [colorPickerHexInput, setColorPickerHexInput] = useState(
    paletteHexColors.join(', ')
  );

  // Sync colors when palette changes (from Mood or Image generation)
  const currentTimestamp = palette?.metadata.timestamp ?? null;
  if (currentTimestamp !== lastPaletteTimestamp && currentTimestamp !== null) {
    setLastPaletteTimestamp(currentTimestamp);
    setColorPickerColors(paletteHexColors);
    setColorPickerHexInput(paletteHexColors.join(', '));
  }

  const handleColorsChange = (colors: string[], hexInput: string) => {
    setColorPickerColors(colors);
    setColorPickerHexInput(hexInput);
  };

  const handleGenerate = async (
    type: 'mood' | 'color' | 'image',
    data: {
      mood?: string;
      colors?: OKLCHColor[];
      pixels?: { r: number; g: number; b: number }[];
    }
  ) => {
    setLoading(true);
    try {
      const result = await apiPost<GenerateResponse>(`/generate/${type}`, data);
      onGenerate(result.data);
    } catch (error) {
      console.error('Error generating palette:', error);
      alert('Failed to generate palette. Please sign in and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="palette-generator">
      <div className="generator-tabs">
        <button
          className={`tab ${activeTab === 'mood' ? 'active' : ''}`}
          onClick={() => setActiveTab('mood')}
        >
          Mood
        </button>
        <button
          className={`tab ${activeTab === 'color' ? 'active' : ''}`}
          onClick={() => setActiveTab('color')}
        >
          Color
        </button>
        <button
          className={`tab ${activeTab === 'image' ? 'active' : ''}`}
          onClick={() => setActiveTab('image')}
        >
          Image
        </button>
      </div>

      <div className="generator-content">
        {activeTab === 'mood' && (
          <MoodGenerator
            onGenerate={mood => handleGenerate('mood', { mood })}
            loading={loading}
          />
        )}
        {activeTab === 'color' && (
          <ColorGenerator
            onGenerate={colors => handleGenerate('color', { colors })}
            loading={loading}
            colors={colorPickerColors}
            hexInput={colorPickerHexInput}
            onColorsChange={handleColorsChange}
          />
        )}
        {activeTab === 'image' && (
          <ImageGenerator
            onGenerate={pixels => handleGenerate('image', { pixels })}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
