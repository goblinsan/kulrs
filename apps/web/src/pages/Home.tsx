import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaletteGenerator } from '../components/palette/PaletteGenerator';
import { type GeneratedPalette, generateFromMood } from '@kulrs/shared';
import { PaletteDisplay } from '../components/palette/PaletteDisplay';
import { HeroPalette } from '../components/palette/HeroPalette';
import { initialPalette, MOODS } from '../components/palette/paletteUtils';
import './Home.css';

export function Home() {
  const [palette, setPalette] = useState<GeneratedPalette | null>(null);
  const navigate = useNavigate();

  const handlePaletteGenerated = (newPalette: GeneratedPalette) => {
    setPalette(newPalette);
  };

  const handleRandomGenerate = useCallback(() => {
    const randomMood = MOODS[Math.floor(Math.random() * MOODS.length)];
    const newPalette = generateFromMood(randomMood);
    setPalette(newPalette);
  }, []);

  const handleViewDetails = () => {
    if (palette) {
      // Encode palette data in URL
      const paletteData = encodeURIComponent(JSON.stringify(palette));
      navigate(`/palette/${paletteData}`);
    }
  };

  // Use palette if set, otherwise use the initial palette for color tab
  const displayPalette = palette || initialPalette;

  return (
    <div className="home">
      <div className="hero-wrapper">
        <HeroPalette palette={palette} />

        <div className="home-header">
          <button
            className="hero-title-button"
            onClick={handleRandomGenerate}
            title="Click to generate a random palette"
          >
            Generate Your Color Palette
          </button>
          <p>
            Create beautiful, accessible color palettes from moods, colors, or
            images
          </p>
        </div>
      </div>

      <PaletteGenerator
        onGenerate={handlePaletteGenerated}
        palette={displayPalette}
        onRandomGenerate={handleRandomGenerate}
      />

      {palette && (
        <div className="palette-result">
          <h2>Generated Palette</h2>
          <p className="palette-explanation">{palette.metadata.explanation}</p>
          <PaletteDisplay palette={palette} showControls={true} />
          <button onClick={handleViewDetails} className="view-details-button">
            View Details & Share
          </button>
        </div>
      )}
    </div>
  );
}
