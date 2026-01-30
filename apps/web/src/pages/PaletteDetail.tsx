import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { type GeneratedPalette } from '@kulrs/shared';
import { PaletteDisplay } from '../components/palette/PaletteDisplay';
import { usePaletteActions } from '../hooks/usePaletteActions';
import './PaletteDetail.css';

export function PaletteDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    loading,
    error: apiError,
    savePaletteToDb,
    saveExistingPalette,
    likePalette: likePaletteAction,
    remixPalette: remixPaletteAction,
  } = usePaletteActions();

  const [palette, setPalette] = useState<GeneratedPalette | null>(null);
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Parse palette from URL on mount
  useEffect(() => {
    if (!id) {
      setError('No palette data provided');
      return;
    }

    try {
      const decoded = decodeURIComponent(id);
      const parsedPalette = JSON.parse(decoded);
      setPalette(parsedPalette);

      // Auto-save palette to database when viewing details
      savePaletteToDb(parsedPalette).then(savedId => {
        if (savedId) {
          setPaletteId(savedId);
          setIsSaved(true);
        }
      });
    } catch (e) {
      setError('Invalid palette data');
      console.error('Error parsing palette data:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
        setActionFeedback('Share link copied to clipboard!');
        setTimeout(() => setActionFeedback(null), 3000);
      })
      .catch(error => {
        console.error('Failed to copy to clipboard:', error);
        setActionFeedback('Failed to copy link');
        setTimeout(() => setActionFeedback(null), 3000);
      });
  };

  const handleSave = async () => {
    if (!paletteId) {
      setActionFeedback('Palette not yet saved to database');
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }

    const result = await saveExistingPalette(paletteId);
    if (result.success) {
      if (result.alreadySaved) {
        setActionFeedback('Already in your saved collection');
      } else {
        setActionFeedback('Added to your saved collection!');
        setIsSaved(true);
      }
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleLike = async () => {
    if (!paletteId) {
      setActionFeedback('Palette not yet saved to database');
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }

    const result = await likePaletteAction(paletteId);
    if (result.success) {
      if (result.alreadyLiked) {
        setActionFeedback('Already liked');
      } else {
        setActionFeedback('Liked!');
        setIsLiked(true);
      }
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleRemix = async () => {
    if (!paletteId) {
      setActionFeedback('Palette not yet saved to database');
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }

    const newPaletteId = await remixPaletteAction(paletteId);
    if (newPaletteId) {
      setActionFeedback('Palette remixed! Redirecting...');
      setTimeout(() => {
        // For now, we'll stay on the same page since we don't have a way to view by ID yet
        // In the future, this would navigate to /palette/:id where id is the database ID
        setActionFeedback('Remix created successfully!');
        setTimeout(() => setActionFeedback(null), 3000);
      }, 1000);
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
            disabled={loading}
            title="Save to your collection"
          >
            {isSaved ? '✓ Saved' : '💾 Save'}
          </button>
          <button
            onClick={handleLike}
            className={`action-button like-button ${isLiked ? 'active' : ''}`}
            disabled={loading}
            title="Like this palette"
          >
            {isLiked ? '❤️ Liked' : '🤍 Like'}
          </button>
          <button
            onClick={handleRemix}
            className="action-button remix-button"
            disabled={loading}
            title="Create a remix of this palette"
          >
            🎨 Remix
          </button>
          <button
            onClick={handleCopyShareLink}
            className="action-button share-button"
            title="Copy share link"
          >
            📋 Share
          </button>
        </div>

        {actionFeedback && (
          <div className="action-feedback">{actionFeedback}</div>
        )}
        {apiError && <div className="action-error">{apiError}</div>}
      </div>

      <PaletteDisplay palette={palette} showControls={true} />
    </div>
  );
}
