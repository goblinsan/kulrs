import { useState, useMemo } from 'react';
import { type GeneratedPalette, type OKLCHColor } from '@kulrs/shared';
import { MoodGenerator } from './MoodGenerator';
import { ColorGenerator } from './ColorGenerator';
import { ImageGenerator } from './ImageGenerator';
import { oklchToHex } from './paletteUtils';
import { apiPost } from '../../services/api';
import './PaletteGenerator.css';

type GeneratorTab = 'color' | 'mood' | 'image';

interface PaletteGeneratorProps {
  onGenerate: (palette: GeneratedPalette) => void;
  palette?: GeneratedPalette | null;
  onRandomGenerate?: (colorCount: number) => void;
}

interface GenerateResponse {
  success: boolean;
  data: GeneratedPalette;
}

export function PaletteGenerator({
  onGenerate,
  palette,
  onRandomGenerate,
}: PaletteGeneratorProps) {
  const [colorCount, setColorCount] = useState(5);
  const maxColors = colorCount;
  const [activeTab, setActiveTab] = useState<GeneratorTab>('color');
  const [loading, setLoading] = useState(false);

  // Derive colors from palette for ColorGenerator
  const paletteHexColors = useMemo(() => {
    if (!palette || palette.colors.length === 0) {
      return ['#646cff'];
    }
    return palette.colors.slice(0, maxColors).map(c => oklchToHex(c.color));
  }, [palette, maxColors]);

  // Track the last palette timestamp to detect changes
  const [lastPaletteTimestamp, setLastPaletteTimestamp] = useState<
    string | null
  >(null);

  // State for ColorGenerator - initialize with a function to ensure proper first render
  const [colorPickerColors, setColorPickerColors] = useState<string[]>(() => {
    if (!palette || palette.colors.length === 0) {
      return ['#646cff'];
    }
    return palette.colors.slice(0, colorCount).map(c => oklchToHex(c.color));
  });
  const [colorPickerHexInput, setColorPickerHexInput] = useState(() => {
    if (!palette || palette.colors.length === 0) {
      return '#646cff';
    }
    return palette.colors
      .slice(0, colorCount)
      .map(c => oklchToHex(c.color))
      .join(', ');
  });

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
      // Include colorCount in the API request
      const requestData = { ...data, colorCount: maxColors };
      const result = await apiPost<GenerateResponse>(
        `/generate/${type}`,
        requestData
      );
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
          className={`tab ${activeTab === 'color' ? 'active' : ''}`}
          onClick={() => setActiveTab('color')}
        >
          Color
        </button>
        {/* Mood tab hidden for now - needs improvement
        <button
          className={`tab ${activeTab === 'mood' ? 'active' : ''}`}
          onClick={() => setActiveTab('mood')}
        >
          Mood
        </button>
        */}
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
            onRandomGenerate={() => onRandomGenerate?.(colorCount)}
            colorCount={colorCount}
            onColorCountChange={setColorCount}
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
