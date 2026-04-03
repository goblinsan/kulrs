import { PALETTE_STYLES, type PaletteStyle } from '@kulrs/shared';
import './StyleSelector.css';

interface StyleSelectorProps {
  value: PaletteStyle;
  onChange: (style: PaletteStyle) => void;
}

/**
 * Dropdown control that lets users choose a preset palette style before
 * generating a random palette in the hero section.
 *
 * Renders a native <select> element styled to blend with the translucent
 * hero overlay.  The "Random" option is first and represents the default
 * (unconstrained) generation behaviour.
 */
export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  return (
    <div className="style-selector">
      <label htmlFor="palette-style-select" className="style-selector__label">
        Style
      </label>
      <select
        id="palette-style-select"
        className="style-selector__select"
        value={value}
        onChange={e => onChange(e.target.value as PaletteStyle)}
        title="Choose a palette style preset"
      >
        {PALETTE_STYLES.map(style => (
          <option key={style.slug} value={style.slug} title={style.description}>
            {style.label}
          </option>
        ))}
      </select>
    </div>
  );
}
