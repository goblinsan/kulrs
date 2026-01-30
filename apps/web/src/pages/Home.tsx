import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaletteGenerator } from '../components/palette/PaletteGenerator';
import { type GeneratedPalette } from '@kulrs/shared';
import { PaletteDisplay } from '../components/palette/PaletteDisplay';
import { HeroPalette } from '../components/palette/HeroPalette';
import './Home.css';

export function Home() {
  const [palette, setPalette] = useState<GeneratedPalette | null>(null);
  const navigate = useNavigate();

  const handlePaletteGenerated = (newPalette: GeneratedPalette) => {
    setPalette(newPalette);
  };

  const handleViewDetails = () => {
    if (palette) {
      // Encode palette data in URL
      const paletteData = encodeURIComponent(JSON.stringify(palette));
      navigate(`/palette/${paletteData}`);
    }
  };

  return (
    <div className="home">
      <HeroPalette />

      <div className="home-header">
        <h1>Generate Your Color Palette</h1>
        <p>
          Create beautiful, accessible color palettes from moods, colors, or
          images
        </p>
      </div>

      <PaletteGenerator onGenerate={handlePaletteGenerated} />

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
