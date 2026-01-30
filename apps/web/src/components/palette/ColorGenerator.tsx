import { useState } from 'react';
import { type OKLCHColor, rgbToOklch } from '@kulrs/shared';
import './Generators.css';

interface ColorGeneratorProps {
  onGenerate: (colors: OKLCHColor[]) => void;
  loading: boolean;
  colors: string[];
  hexInput: string;
  onColorsChange: (colors: string[], hexInput: string) => void;
  onRandomGenerate?: () => void;
}

const MAX_COLORS = 5;

export function ColorGenerator({
  onGenerate,
  loading,
  colors,
  hexInput,
  onColorsChange,
  onRandomGenerate,
}: ColorGeneratorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const hexToOklch = (hex: string): OKLCHColor | null => {
    // Clean and validate hex format
    const cleanHex = hex.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) {
      return null;
    }

    // Convert hex to RGB
    const r = parseInt(cleanHex.slice(1, 3), 16);
    const g = parseInt(cleanHex.slice(3, 5), 16);
    const b = parseInt(cleanHex.slice(5, 7), 16);

    // Use the proper conversion from shared package
    return rgbToOklch({ r, g, b });
  };

  const parseHexInput = (input: string): string[] => {
    // Parse comma or space separated hex colors
    return input
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => (s.startsWith('#') ? s : `#${s}`))
      .filter(s => /^#[0-9A-Fa-f]{6}$/i.test(s))
      .slice(0, MAX_COLORS);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Auto-parse if we detect valid colors
    const parsed = parseHexInput(value);
    if (parsed.length > 0) {
      onColorsChange(parsed, value);
    } else {
      onColorsChange(colors, value);
    }
  };

  const handleColorChange = (index: number, value: string) => {
    const newColors = [...colors];
    newColors[index] = value;
    onColorsChange(newColors, newColors.join(', '));
  };

  const addColor = () => {
    if (colors.length < MAX_COLORS) {
      const newColors = [...colors, '#888888'];
      onColorsChange(newColors, newColors.join(', '));
    }
  };

  const removeColor = (index: number) => {
    if (colors.length > 1) {
      const newColors = colors.filter((_, i) => i !== index);
      onColorsChange(newColors, newColors.join(', '));
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newColors = [...colors];
    const [draggedColor] = newColors.splice(draggedIndex, 1);
    newColors.splice(targetIndex, 0, draggedColor);

    onColorsChange(newColors, newColors.join(', '));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch handlers for mobile drag and drop
  const handleTouchStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null) return;

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const colorItem = element?.closest('.color-picker-item');
    if (colorItem) {
      const index = parseInt(colorItem.getAttribute('data-index') || '-1', 10);
      if (index >= 0 && index !== dragOverIndex) {
        setDragOverIndex(index);
      }
    }
  };

  const handleTouchEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newColors = [...colors];
      const [draggedColor] = newColors.splice(draggedIndex, 1);
      newColors.splice(dragOverIndex, 0, draggedColor);
      onColorsChange(newColors, newColors.join(', '));
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const oklchColors = colors
        .map(hexToOklch)
        .filter((c): c is OKLCHColor => c !== null);

      if (oklchColors.length === 0) {
        alert('Please enter at least one valid hex color');
        return;
      }

      onGenerate(oklchColors);
    } catch (error) {
      console.error('Invalid color:', error);
    }
  };

  return (
    <div className="generator-form">
      <h3>Generate from Base Colors</h3>
      <p className="generator-description">
        Pick up to {MAX_COLORS} base colors to generate a harmonious palette
      </p>

      <form onSubmit={handleSubmit}>
        <div className="multi-color-input">
          <input
            type="text"
            value={hexInput}
            onChange={handleHexInputChange}
            placeholder="#646cff, #ff6464, #64ff64"
            className="hex-input"
            disabled={loading}
          />
        </div>

        <p className="drag-hint">Drag to reorder colors</p>

        <div
          className="color-pickers-row"
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {colors.map((color, index) => (
            <div
              key={index}
              data-index={index}
              className={`color-picker-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
              draggable={!loading}
              onDragStart={() => handleDragStart(index)}
              onDragOver={e => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              onTouchStart={() => handleTouchStart(index)}
            >
              <div className="drag-handle" title="Drag to reorder">
                ⋮⋮
              </div>
              <input
                type="color"
                value={color}
                onChange={e => handleColorChange(index, e.target.value)}
                className="color-picker"
                disabled={loading}
              />
              {colors.length > 1 && (
                <button
                  type="button"
                  className="remove-color-button"
                  onClick={() => removeColor(index)}
                  disabled={loading}
                  title="Remove color"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {colors.length < MAX_COLORS && (
            <button
              type="button"
              className="add-color-button"
              onClick={addColor}
              disabled={loading}
              title="Add another color"
            >
              +
            </button>
          )}
        </div>

        <div className="generator-buttons-row">
          <button type="submit" className="generate-button" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Palette'}
          </button>
          {onRandomGenerate && (
            <button
              type="button"
              className="random-button"
              onClick={onRandomGenerate}
              disabled={loading}
              title="Generate a random palette"
            >
              🎲 Random
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
