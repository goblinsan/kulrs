import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaletteGenerator } from '../components/palette/PaletteGenerator';
import {
  type GeneratedPalette,
  type AssignedColor,
  generateFromMood,
} from '@kulrs/shared';
import { PaletteDisplay } from '../components/palette/PaletteDisplay';
import { HeroPalette } from '../components/palette/HeroPalette';
import { initialPalette, MOODS } from '../components/palette/paletteUtils';
import { useAuth } from '../contexts/AuthContext';
import { apiPost, likePalette, unlikePalette } from '../services/api';
import './Home.css';

export function Home() {
  const [palette, setPalette] = useState<GeneratedPalette | null>(null);
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const handleRandomGenerate = useCallback(() => {
    const randomMood = MOODS[Math.floor(Math.random() * MOODS.length)];
    const newPalette = generateFromMood(randomMood);
    setPalette(newPalette);
    setPaletteId(null);
    // Reset like/save state for new palette
    setLiked(false);
    setLikeCount(0);
    setSaved(false);
  }, []);

  const handleLike = async () => {
    // Toggle local state immediately for responsiveness
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => (newLiked ? prev + 1 : Math.max(0, prev - 1)));

    // If palette is saved and user is logged in, persist to API
    if (paletteId && user) {
      try {
        if (newLiked) {
          const result = await likePalette(paletteId);
          if (result.data.likesCount !== undefined) {
            setLikeCount(result.data.likesCount);
          }
        } else {
          const result = await unlikePalette(paletteId);
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
    }
  };

  const handleSave = async () => {
    if (!palette || !user) return;

    setSaving(true);
    try {
      const result = await apiPost<{
        success: boolean;
        data: { id: string; likesCount: number };
      }>('/palettes', { palette });
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
          <PaletteDisplay
            palette={palette}
            showControls={true}
            onPaletteChange={handlePaletteChange}
          />
          <div className="palette-actions">
            <button
              onClick={handleLike}
              className={`like-button ${liked ? 'liked' : ''}`}
              title={liked ? 'Unlike palette' : 'Like palette'}
            >
              {liked ? '❤️' : '🤍'} {likeCount > 0 ? likeCount : ''}{' '}
              {liked ? 'Liked' : 'Like'}
            </button>
            {user && (
              <button
                onClick={handleSave}
                className={`save-button ${saved ? 'saved' : ''}`}
                disabled={saving || saved}
                title={saved ? 'Palette saved' : 'Save palette to your account'}
              >
                {saving ? '💾 Saving...' : saved ? '✓ Saved' : '💾 Save'}
              </button>
            )}
            <button onClick={handleViewDetails} className="view-details-button">
              View Details & Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
