import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  type GeneratedPalette,
  ColorRole,
  type AssignedColor,
} from '@kulrs/shared';
import { PaletteDisplay } from '../components/palette/PaletteDisplay';
import { ColorExportTable } from '../components/palette/ColorExportTable';
import { usePaletteActions } from '../hooks/usePaletteActions';
import {
  getPaletteById,
  getLikeInfo,
  likePalette as likePaletteApi,
  unlikePalette as unlikePaletteApi,
  type BrowsePalette,
} from '../services/api';
import {
  hexToOklch,
  buildPaletteColorsParam,
  oklchToHex,
} from '../utils/colorUtils';
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

export function PaletteDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    loading,
    error: apiError,
    createPaletteInDb,
    saveExistingPalette,
  } = usePaletteActions();

  const [palette, setPalette] = useState<GeneratedPalette | null>(null);
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Keep palette colors in sessionStorage so other tabs (Design, Compose, etc.)
  // can pick them up even without explicit URL params.
  useEffect(() => {
    if (!palette) return;
    try {
      const hexColors = palette.colors.map(c => oklchToHex(c.color));
      sessionStorage.setItem('kulrs_palette_colors', JSON.stringify(hexColors));
    } catch {
      /* ignore */
    }
  }, [palette]);

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

  // Load like state when paletteId is available
  useEffect(() => {
    if (!paletteId) return;
    getLikeInfo(paletteId)
      .then(res => {
        setIsLiked(res.data.userLiked);
        setLikeCount(res.data.likesCount);
      })
      .catch(err => console.error('Error loading like info:', err));
  }, [paletteId]);

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

    // Optimistic toggle
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => (newLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      if (newLiked) {
        const result = await likePaletteApi(paletteId);
        if (result.data.likesCount !== undefined) {
          setLikeCount(result.data.likesCount);
        }
      } else {
        const result = await unlikePaletteApi(paletteId);
        if (result.data.likesCount !== undefined) {
          setLikeCount(result.data.likesCount);
        }
      }
    } catch (error) {
      // Revert on error
      setIsLiked(!newLiked);
      setLikeCount(prev => (newLiked ? Math.max(0, prev - 1) : prev + 1));
      showFeedback('Failed to update like. Please try again.');
      console.error('Failed to update like:', error);
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
            title={isLiked ? 'Unlike this palette' : 'Like this palette'}
          >
            <i className={`fa-${isLiked ? 'solid' : 'regular'} fa-heart`}></i>
            {isLiked ? 'Liked' : 'Like'}
            {likeCount > 0 ? ` (${likeCount})` : ''}
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
          <button
            onClick={() => {
              if (!palette) return;
              const colorsParam = buildPaletteColorsParam(
                palette.colors.map(c => c.color)
              );
              navigate(`/compose?colors=${colorsParam}`);
            }}
            className="action-button compose-button"
            aria-label="Compose music from this palette"
            title="Compose music from this palette"
          >
            <i className="fa-solid fa-music"></i>
            Compose
          </button>
          <button
            onClick={() => {
              if (!palette) return;
              const colorsParam = buildPaletteColorsParam(
                palette.colors.map(c => c.color)
              );
              navigate(`/pattern?colors=${colorsParam}`);
            }}
            className="action-button pattern-button"
            aria-label="Create patterns from this palette"
            title="Create patterns from this palette"
          >
            <i className="fa-solid fa-shapes"></i>
            Pattern
          </button>
          <button
            onClick={() => {
              if (!palette) return;
              const colorsParam = buildPaletteColorsParam(
                palette.colors.map(c => c.color)
              );
              navigate(`/design?colors=${colorsParam}`);
            }}
            className="action-button design-button"
            aria-label="Design with this palette"
            title="Design with this palette"
          >
            <i className="fa-solid fa-palette"></i>
            Design
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
