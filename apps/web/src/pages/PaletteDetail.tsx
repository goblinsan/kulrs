import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  type GeneratedPalette,
  ColorRole,
  type AssignedColor,
} from '@kulrs/shared';
import { PaletteDisplay } from '../components/palette/PaletteDisplay';
import { ColorExportTable } from '../components/palette/ColorExportTable';
import { usePaletteActions } from '../hooks/usePaletteActions';
import { getPaletteById, type BrowsePalette } from '../services/api';
import './PaletteDetail.css';

// Check if a string looks like a UUID (existing palette ID)
function isUuid(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Map color name string to ColorRole enum
function stringToColorRole(name: string | null): ColorRole {
  const roleMap: Record<string, ColorRole> = {
    background: ColorRole.BACKGROUND,
    text: ColorRole.TEXT,
    primary: ColorRole.PRIMARY,
    secondary: ColorRole.SECONDARY,
    accent: ColorRole.ACCENT,
    error: ColorRole.ERROR,
    warning: ColorRole.WARNING,
    success: ColorRole.SUCCESS,
    info: ColorRole.INFO,
  };
  return roleMap[name?.toLowerCase() || ''] || ColorRole.PRIMARY;
}

// Convert a browsed palette to GeneratedPalette format for display
function browsePaletteToGenerated(
  browsePalette: BrowsePalette
): GeneratedPalette {
  const colors: AssignedColor[] = browsePalette.colors.map(c => ({
    role: stringToColorRole(c.name),
    color: hexToOklch(c.hexValue),
  }));

  return {
    colors,
    metadata: {
      generator: 'browse',
      explanation: browsePalette.description || browsePalette.name,
      timestamp: browsePalette.createdAt,
    },
  };
}

// Convert hex to OKLCH (simplified approximation for display)
function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  // Convert to linear RGB
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  // Convert to XYZ
  const x = 0.4124 * lr + 0.3576 * lg + 0.1805 * lb;
  const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  const z = 0.0193 * lr + 0.1192 * lg + 0.9505 * lb;

  // Convert to Lab (simplified)
  const l = 116 * Math.cbrt(y) - 16;
  const a = 500 * (Math.cbrt(x / 0.95047) - Math.cbrt(y));
  const bLab = 200 * (Math.cbrt(y) - Math.cbrt(z / 1.08883));

  // Convert to OKLCH (approximate)
  const oklchL = Math.max(0, Math.min(1, l / 100));
  const chroma = Math.sqrt(a * a + bLab * bLab) / 150;
  const hue = ((Math.atan2(bLab, a) * 180) / Math.PI + 360) % 360;

  return { l: oklchL, c: chroma, h: hue };
}

export function PaletteDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    loading,
    error: apiError,
    createPaletteInDb,
    saveExistingPalette,
    likePalette: likePaletteAction,
  } = usePaletteActions();

  const [palette, setPalette] = useState<GeneratedPalette | null>(null);
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Load palette - either fetch by ID or parse from URL
  useEffect(() => {
    if (!id) {
      setError('No palette data provided');
      setIsLoading(false);
      return;
    }

    // Check if this is an existing palette ID (UUID format)
    if (isUuid(id)) {
      // Fetch existing palette from API
      setPaletteId(id);
      setIsLoading(true);

      getPaletteById(id)
        .then(response => {
          if (response.success && response.data) {
            setPalette(browsePaletteToGenerated(response.data));
          } else {
            setError('Palette not found');
          }
        })
        .catch(err => {
          console.error('Error fetching palette:', err);
          setError('Failed to load palette');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Parse encoded palette from URL (new palette)
      try {
        const decoded = decodeURIComponent(id);
        const parsedPalette = JSON.parse(decoded);
        setPalette(parsedPalette);
        setIsLoading(false);

        // Create palette in database (not saved to user's collection yet)
        createPaletteInDb(parsedPalette)
          .then(savedId => {
            if (savedId) {
              setPaletteId(savedId);
            } else {
              setActionFeedback(
                'Warning: Could not create palette in database. Save/Like/Remix may not work.'
              );
            }
          })
          .catch(err => {
            console.error('Error creating palette:', err);
            setActionFeedback(
              'Warning: Could not create palette in database. Save/Like/Remix may not work.'
            );
          });
      } catch (e) {
        setError('Invalid palette data');
        setIsLoading(false);
        console.error('Error parsing palette data:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Helper to show feedback with auto-dismiss
  const showFeedback = (message: string, duration = 3000) => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    setActionFeedback(message);
    timeoutRef.current = window.setTimeout(() => {
      setActionFeedback(null);
      timeoutRef.current = null;
    }, duration);
  };

  if (isLoading) {
    return (
      <div className="palette-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading palette...</p>
      </div>
    );
  }

  if (error || !palette) {
    return (
      <div className="palette-detail-error">
        <h1>Error</h1>
        <p>{error || 'Palette not found'}</p>
      </div>
    );
  }

  const shareUrl = window.location.href;

  const handleCopyShareLink = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        showFeedback('Share link copied to clipboard!');
      })
      .catch(error => {
        console.error('Failed to copy to clipboard:', error);
        showFeedback('Failed to copy link');
      });
  };

  const handleSave = async () => {
    if (!paletteId) {
      showFeedback('Please wait a moment and try again');
      return;
    }

    const result = await saveExistingPalette(paletteId);
    if (result.success) {
      if (result.alreadySaved) {
        showFeedback('Already in your saved collection');
      } else {
        showFeedback('Added to your saved collection!');
        setIsSaved(true);
      }
    } else {
      showFeedback('Failed to save palette. Please try again.');
    }
  };

  const handleLike = async () => {
    if (!paletteId) {
      showFeedback('Please wait a moment and try again');
      return;
    }

    const result = await likePaletteAction(paletteId);
    if (result.success) {
      if (result.alreadyLiked) {
        showFeedback('Already liked');
      } else {
        showFeedback('Liked!');
        setIsLiked(true);
      }
    } else {
      showFeedback('Failed to like palette. Please try again.');
    }
  };

  return (
    <div className="palette-detail">
      <div className="palette-detail-header">
        <h1>Color Palette</h1>
        <p className="palette-metadata">
          Generated via {palette.metadata.generator} •{' '}
          {new Date(palette.metadata.timestamp).toLocaleDateString()}
        </p>
        <p className="palette-explanation">{palette.metadata.explanation}</p>

        <div className="palette-actions">
          <button
            onClick={handleSave}
            className={`action-button save-button ${isSaved ? 'active' : ''}`}
            disabled={loading || !paletteId}
            aria-label="Save palette to your collection"
            title="Save to your collection"
          >
            <i className="fa-regular fa-bookmark"></i>
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={handleLike}
            className={`action-button like-button ${isLiked ? 'active' : ''}`}
            disabled={loading || !paletteId}
            aria-label="Like this palette"
            title="Like this palette"
          >
            <i className={`fa-${isLiked ? 'solid' : 'regular'} fa-heart`}></i>
            {isLiked ? 'Liked' : 'Like'}
          </button>
          <button
            onClick={handleCopyShareLink}
            className="action-button share-button"
            aria-label="Copy share link to clipboard"
            title="Copy share link"
          >
            <i className="fa-solid fa-link"></i>
            Share
          </button>
        </div>

        {actionFeedback && (
          <div className="action-feedback">{actionFeedback}</div>
        )}
        {apiError && <div className="action-error">{apiError}</div>}
      </div>

      <PaletteDisplay palette={palette} />

      <ColorExportTable palette={palette} />
    </div>
  );
}
