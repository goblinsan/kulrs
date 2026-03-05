import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { type AssignedColor, rgbToOklch } from '@kulrs/shared';
import { oklchToHex, getTextColor, hexToRgb } from '../../utils/colorUtils';
import './PaletteEditor.css';

interface PaletteEditorProps {
  colors: AssignedColor[];
  onChange: (colors: AssignedColor[]) => void;
}

export function PaletteEditor({ colors, onChange }: PaletteEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Refs used for touch-drag so handlers always see the latest values
  const touchDragIndexRef = useRef<number | null>(null);
  const touchOverIndexRef = useRef<number | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const colorsRef = useRef(colors);
  const onChangeRef = useRef(onChange);

  // Keep refs in sync with the latest props without adding them to the
  // touch-listener effect's dependency array (avoids re-registering listeners
  // on every render triggered by colors changes).
  useLayoutEffect(() => {
    colorsRef.current = colors;
    onChangeRef.current = onChange;
  });

  // Register non-passive document listeners once so touchmove can preventDefault
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (touchDragIndexRef.current === null) return;
      e.preventDefault(); // stop page scroll while dragging a row

      const touch = e.touches[0];
      for (let i = 0; i < rowRefs.current.length; i++) {
        const row = rowRefs.current[i];
        if (!row) continue;
        const rect = row.getBoundingClientRect();
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          if (touchOverIndexRef.current !== i) {
            touchOverIndexRef.current = i;
            setDragOverIndex(i);
          }
          break;
        }
      }
    };

    const handleTouchEnd = () => {
      if (touchDragIndexRef.current === null) return;
      const fromIndex = touchDragIndexRef.current;
      const toIndex = touchOverIndexRef.current;

      if (toIndex !== null && toIndex !== fromIndex) {
        const newColors = [...colorsRef.current];
        const [moved] = newColors.splice(fromIndex, 1);
        newColors.splice(toIndex, 0, moved);
        onChangeRef.current(newColors);
      }

      touchDragIndexRef.current = null;
      touchOverIndexRef.current = null;
      setDragIndex(null);
      setDragOverIndex(null);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove, {
        passive: false,
      } as EventListenerOptions);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    e.preventDefault(); // prevent scroll starting from the handle
    touchDragIndexRef.current = index;
    touchOverIndexRef.current = index;
    setDragIndex(index);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newColors = [...colors];
    const [moved] = newColors.splice(dragIndex, 1);
    newColors.splice(dropIndex, 0, moved);
    onChange(newColors);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleColorChange = (index: number, hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    const newColors = [...colors];
    newColors[index] = { ...newColors[index], color: rgbToOklch({ r, g, b }) };
    onChange(newColors);
  };

  const handleDelete = (index: number) => {
    if (colors.length <= 1) return;
    onChange(colors.filter((_, i) => i !== index));
  };

  return (
    <div className="palette-editor">
      <p className="palette-editor-hint">
        <i className="fa-solid fa-grip-vertical" aria-hidden="true" />
        {' Drag to reorder · Click swatch to change color · '}
        <i className="fa-solid fa-xmark" aria-hidden="true" />
        {' to delete'}
      </p>
      <div className="palette-editor-list">
        {colors.map((color, index) => {
          const hex = oklchToHex(color.color);
          const textColor = getTextColor(hex);
          const isDragging = dragIndex === index;
          const isOver =
            dragOverIndex === index &&
            dragIndex !== null &&
            dragIndex !== index;

          return (
            <div
              key={`${color.role}-${index}`}
              ref={el => {
                rowRefs.current[index] = el;
              }}
              className={`palette-editor-row${isDragging ? ' is-dragging' : ''}${isOver ? ' drag-over' : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={e => handleDragOver(e, index)}
              onDrop={e => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Drag handle */}
              <span
                className="editor-drag-handle"
                title="Drag to reorder"
                aria-hidden="true"
                onTouchStart={e => handleTouchStart(e, index)}
              >
                <i className="fa-solid fa-grip-vertical" />
              </span>

              {/* Color swatch + hidden picker */}
              <label
                className="editor-swatch-label"
                title="Click to change color"
              >
                <div
                  className="editor-swatch-fill"
                  style={{ backgroundColor: hex, color: textColor }}
                >
                  <span className="editor-hex">{hex}</span>
                  <span className="editor-edit-hint">
                    <i className="fa-solid fa-droplet" /> edit
                  </span>
                </div>
                <input
                  type="color"
                  value={hex}
                  onChange={e => handleColorChange(index, e.target.value)}
                  className="editor-color-input"
                  aria-label={`Change color for ${color.role}`}
                />
              </label>

              {/* Role name */}
              <span className="editor-role">{color.role}</span>

              {/* Delete button */}
              <button
                className="editor-delete-btn"
                onClick={() => handleDelete(index)}
                disabled={colors.length <= 1}
                title={
                  colors.length <= 1
                    ? 'Cannot remove last color'
                    : `Remove ${color.role} color`
                }
                aria-label={`Remove ${color.role} color`}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
