import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PaletteGenerator } from '../components/palette/PaletteGenerator';
import {
  type GeneratedPalette,
  type AssignedColor,
  generateRandom,
  oklchToRgb,
} from '@kulrs/shared';
import { PaletteDisplay } from '../components/palette/PaletteDisplay';
import { HeroPalette } from '../components/palette/HeroPalette';
import { initialPalette } from '../components/palette/paletteUtils';
import { useAuth } from '../contexts/AuthContext';
import { apiPost, likePalette, unlikePalette } from '../services/api';
import './Home.css';

export function Home() {
  const [palette, setPalette] = useState<GeneratedPalette>(initialPalette);
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Restore palette from Compose tab if navigated back with state
  useEffect(() => {
    const state = location.state as {
      paletteFromCompose?: GeneratedPalette;
    } | null;
    if (state?.paletteFromCompose) {
      setPalette(state.paletteFromCompose);
      setPaletteId(null);
      setLiked(false);
      setLikeCount(0);
      setSaved(false);
      // Clear the state so refreshing doesn't re-apply
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Keep current palette hex colors in sessionStorage so the Compose tab
  // nav link can pick them up even without explicit URL params.
  useEffect(() => {
    try {
      const hexColors = palette.colors.map(c => {
        const rgb = oklchToRgb(c.color);
        const toHex = (n: number) =>
          Math.round(Math.max(0, Math.min(255, n)))
            .toString(16)
            .padStart(2, '0');
        return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
      });
      sessionStorage.setItem('kulrs_palette_colors', JSON.stringify(hexColors));
    } catch {
      /* ignore */
    }
  }, [palette]);

  const handlePaletteGenerated = (newPalette: GeneratedPalette) => {
    setPalette(newPalette);
    setPaletteId(null);
    setLiked(false);
    setLikeCount(0);
    setSaved(false);
  };

  const handlePaletteChange = useCallback(
    (updatedColors: AssignedColor[]) => {
      if (palette) {
        setPalette({
          ...palette,
          colors: updatedColors,
        });
      }
    },
    [palette]
  );

  const handleRandomGenerate = useCallback((colorCount?: number) => {
    const newPalette = generateRandom(colorCount);
    setPalette(newPalette);
    setPaletteId(null);
    // Reset like/save state for new palette
    setLiked(false);
    setLikeCount(0);
    setSaved(false);
  }, []);

  /** Strip derived background/text colors so only visible palette colors are saved. */
  const mainColorsOnly = useCallback(
    (p: GeneratedPalette): GeneratedPalette => ({
      ...p,
      colors: p.colors.filter(
        c => c.role !== 'background' && c.role !== 'text'
      ),
    }),
    []
  );

  const handleLike = async () => {
    // Toggle local state immediately for responsiveness
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => (newLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      // Auto-save palette to DB first if it hasn't been saved yet
      let id = paletteId;
      if (!id) {
        // Creating a palette requires auth — if not logged in, like is local-only
        if (!user) return;
        const result = await apiPost<{
          success: boolean;
          data: { id: string; likesCount: number };
        }>('/palettes', { palette: mainColorsOnly(palette) });
        id = result.data.id;
        setPaletteId(id);
      }

      if (newLiked) {
        const result = await likePalette(id);
        if (result.data.likesCount !== undefined) {
          setLikeCount(result.data.likesCount);
        }
      } else {
        const result = await unlikePalette(id);
        if (result.data.likesCount !== undefined) {
          setLikeCount(result.data.likesCount);
        }
      }
    } catch (error) {
      // Revert on error
      setLiked(!newLiked);
      setLikeCount(prev => (newLiked ? Math.max(0, prev - 1) : prev + 1));
      console.error('Failed to update like:', error);
    }
  };

  const handleSave = async () => {
    if (!palette || !user) return;

    setSaving(true);
    try {
      const result = await apiPost<{
        success: boolean;
        data: { id: string; likesCount: number };
      }>('/palettes', { palette: mainColorsOnly(palette) });
      setSaved(true);
      setPaletteId(result.data.id);
      setLikeCount(result.data.likesCount);
    } catch (error) {
      console.error('Failed to save palette:', error);
      alert('Failed to save palette. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetails = () => {
    // Encode palette data in URL
    const paletteData = encodeURIComponent(JSON.stringify(palette));
    navigate(`/palette/${paletteData}`);
  };

  const handleCompose = () => {
    const hexColors = palette.colors.map(c => {
      const rgb = oklchToRgb(c.color);
      const toHex = (n: number) =>
        Math.round(Math.max(0, Math.min(255, n)))
          .toString(16)
          .padStart(2, '0');
      return `${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    });
    navigate(`/compose?colors=${hexColors.join(',')}`);
  };

  const handlePattern = () => {
    const hexColors = palette.colors.map(c => {
      const rgb = oklchToRgb(c.color);
      const toHex = (n: number) =>
        Math.round(Math.max(0, Math.min(255, n)))
          .toString(16)
          .padStart(2, '0');
      return `${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    });
    navigate(`/pattern?colors=${hexColors.join(',')}`);
  };

  const handleDesign = () => {
    const hexColors = palette.colors.map(c => {
      const rgb = oklchToRgb(c.color);
      const toHex = (n: number) =>
        Math.round(Math.max(0, Math.min(255, n)))
          .toString(16)
          .padStart(2, '0');
      return `${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    });
    navigate(`/design?colors=${hexColors.join(',')}`);
  };

  return (
    <div className="home">
      <div className="hero-wrapper">
        <HeroPalette palette={palette} />

        <div className="home-header">
          <button
            className="hero-title-button"
            onClick={() => handleRandomGenerate()}
            title="Click to generate a random palette"
          >
            Generate Palette
          </button>
          <p>
            Create beautiful, accessible color palettes from colors or images
          </p>
          <div className="hero-actions">
            <button
              onClick={handleLike}
              className={`hero-action-button hero-like-button ${liked ? 'liked' : ''}`}
              title={liked ? 'Unlike palette' : 'Like palette'}
            >
              <i className={`fa-${liked ? 'solid' : 'regular'} fa-heart`}></i>
              {liked ? 'Liked' : 'Like'} {likeCount > 0 ? `(${likeCount})` : ''}
            </button>
            {user ? (
              <button
                onClick={handleSave}
                className={`hero-action-button hero-save-button ${saved ? 'saved' : ''}`}
                disabled={saving || saved}
                title={saved ? 'Palette saved' : 'Save palette to your account'}
              >
                <i
                  className={`fa-${saved ? 'solid' : 'regular'} fa-bookmark`}
                ></i>
                {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="hero-action-button hero-save-button"
                title="Log in to save palettes"
              >
                <i className="fa-regular fa-bookmark"></i>
                Save
              </button>
            )}
          </div>
        </div>
      </div>

      <PaletteGenerator
        onGenerate={handlePaletteGenerated}
        palette={palette}
        onRandomGenerate={handleRandomGenerate}
      />

      <div className="palette-result">
        <h2>Generated Palette</h2>
        <p className="palette-explanation">{palette.metadata.explanation}</p>
        <PaletteDisplay
          palette={palette}
          onPaletteChange={handlePaletteChange}
        />
        <div className="palette-actions">
          <button
            onClick={handleLike}
            className={`action-button like-button ${liked ? 'liked' : ''}`}
            title={liked ? 'Unlike palette' : 'Like palette'}
          >
            <i className={`fa-${liked ? 'solid' : 'regular'} fa-heart`}></i>
            {liked ? 'Liked' : 'Like'} {likeCount > 0 ? `(${likeCount})` : ''}
          </button>
          {user && (
            <button
              onClick={handleSave}
              className={`action-button save-button ${saved ? 'saved' : ''}`}
              disabled={saving || saved}
              title={saved ? 'Palette saved' : 'Save palette to your account'}
            >
              <i className="fa-regular fa-bookmark"></i>
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
            </button>
          )}
          <button
            onClick={handleViewDetails}
            className="action-button view-details-button"
          >
            <i className="fa-solid fa-arrow-up-right-from-square"></i>
            Details
          </button>
          <button
            onClick={handleCompose}
            className="action-button compose-button"
          >
            <i className="fa-solid fa-music"></i>
            Compose
          </button>
          <button
            onClick={handlePattern}
            className="action-button pattern-button"
          >
            <i className="fa-solid fa-shapes"></i>
            Pattern
          </button>
          <button
            onClick={handleDesign}
            className="action-button design-button"
          >
            <i className="fa-solid fa-palette"></i>
            Design
          </button>
        </div>
      </div>
    </div>
  );
}
