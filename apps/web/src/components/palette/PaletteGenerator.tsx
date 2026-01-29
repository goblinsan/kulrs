import { useState } from 'react';
import { type GeneratedPalette, type OKLCHColor } from '@kulrs/shared';
import { MoodGenerator } from './MoodGenerator';
import { ColorGenerator } from './ColorGenerator';
import { ImageGenerator } from './ImageGenerator';
import './PaletteGenerator.css';

type GeneratorTab = 'mood' | 'color' | 'image';

interface PaletteGeneratorProps {
  onGenerate: (palette: GeneratedPalette) => void;
}

export function PaletteGenerator({ onGenerate }: PaletteGeneratorProps) {
  const [activeTab, setActiveTab] = useState<GeneratorTab>('mood');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (
    type: 'mood' | 'color' | 'image',
    data: {
      mood?: string;
      color?: OKLCHColor;
      pixels?: { r: number; g: number; b: number }[];
    }
  ) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/generate/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to generate palette');
      }

      const result = await response.json();
      onGenerate(result.data);
    } catch (error) {
      console.error('Error generating palette:', error);
      alert('Failed to generate palette. Please try again.');
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
            onGenerate={color => handleGenerate('color', { color })}
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
