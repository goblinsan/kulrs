import {
  type GeneratedPalette,
  type AssignedColor,
  ColorRole,
} from '@kulrs/shared';
import { ColorSwatch } from './ColorSwatch';
import { EditableColorSwatch } from './EditableColorSwatch';
import './PaletteDisplay.css';

interface PaletteDisplayProps {
  palette: GeneratedPalette;
  showControls?: boolean;
  onPaletteChange?: (colors: AssignedColor[]) => void;
}

// Roles that are "derived" and should be editable
const DERIVED_ROLES = [ColorRole.BACKGROUND, ColorRole.TEXT];

export function PaletteDisplay({
  palette,
  showControls = false,
  onPaletteChange,
}: PaletteDisplayProps) {
  // Separate main colors from derived colors
  const mainColors = palette.colors.filter(
    c => !DERIVED_ROLES.includes(c.role as ColorRole)
  );
  const derivedColors = palette.colors.filter(c =>
    DERIVED_ROLES.includes(c.role as ColorRole)
  );

  const handleDerivedColorChange = (
    index: number,
    updatedColor: AssignedColor
  ) => {
    if (!onPaletteChange) return;

    // Find the actual index in the full palette
    const derivedRole = derivedColors[index]?.role;
    const fullIndex = palette.colors.findIndex(c => c.role === derivedRole);

    if (fullIndex === -1) return;

    const newColors = [...palette.colors];
    newColors[fullIndex] = updatedColor;

    onPaletteChange(newColors);
  };

  return (
    <div className="palette-display">
      <div className="palette-section">
        <h4 className="section-title">Main Colors</h4>
        <div className="swatches-grid">
          {mainColors.map((color, index) => (
            <ColorSwatch
              key={index}
              color={color}
              showControls={showControls}
            />
          ))}
        </div>
      </div>

      {derivedColors.length > 0 && (
        <div className="palette-section derived-section">
          <h4 className="section-title">
            Background & Text
            {onPaletteChange && (
              <span className="editable-hint">(click to edit)</span>
            )}
          </h4>
          <div className="swatches-grid derived-grid">
            {derivedColors.map((color, index) =>
              onPaletteChange ? (
                <EditableColorSwatch
                  key={index}
                  color={color}
                  showControls={showControls}
                  onColorChange={updated =>
                    handleDerivedColorChange(index, updated)
                  }
                />
              ) : (
                <ColorSwatch
                  key={index}
                  color={color}
                  showControls={showControls}
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
