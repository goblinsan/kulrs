import { useState } from 'react';
import { type GeneratedPalette, type OKLCHColor } from '@kulrs/shared';
import { MoodGenerator } from './MoodGenerator';
import { ColorGenerator } from './ColorGenerator';
import { ImageGenerator } from './ImageGenerator';
import { apiPost } from '../../services/api';
import './PaletteGenerator.css';

type GeneratorTab = 'mood' | 'color' | 'image';

interface PaletteGeneratorProps {
  onGenerate: (palette: GeneratedPalette) => void;
}

interface GenerateResponse {
  success: boolean;
  data: GeneratedPalette;
}

export function PaletteGenerator({ onGenerate }: PaletteGeneratorProps) {
  const [activeTab, setActiveTab] = useState<GeneratorTab>('mood');
  const [loading, setLoading] = useState(false);

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
