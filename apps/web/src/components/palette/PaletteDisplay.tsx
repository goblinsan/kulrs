import { type GeneratedPalette } from '@kulrs/shared';
import { ColorSwatch } from './ColorSwatch';
import './PaletteDisplay.css';

interface PaletteDisplayProps {
  palette: GeneratedPalette;
  showControls?: boolean;
}

export function PaletteDisplay({ palette, showControls = false }: PaletteDisplayProps) {
  return (
    <div className="palette-display">
      <div className="swatches-grid">
        {palette.colors.map((color, index) => (
          <ColorSwatch
            key={index}
            color={color}
            showControls={showControls}
          />
        ))}
      </div>
    </div>
  );
}
