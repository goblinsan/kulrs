import { useState, useEffect, useRef } from 'react';
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
    createPaletteInDb,
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
  const timeoutRef = useRef<number | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Parse palette from URL and create in database on mount
  useEffect(() => {
    if (!id) {
      setError('No palette data provided');
      return;
    }

    try {
      const decoded = decodeURIComponent(id);
      const parsedPalette = JSON.parse(decoded);
      setPalette(parsedPalette);

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
      console.error('Error parsing palette data:', e);
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

  const handleRemix = async () => {
    if (!paletteId) {
      showFeedback('Please wait a moment and try again');
      return;
    }

    const newPaletteId = await remixPaletteAction(paletteId);
    if (newPaletteId) {
      showFeedback('Remix created successfully!');
    } else {
      showFeedback('Failed to remix palette. Please try again.');
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
            {isSaved ? '✓ Saved' : '💾 Save'}
          </button>
          <button
            onClick={handleLike}
            className={`action-button like-button ${isLiked ? 'active' : ''}`}
            disabled={loading || !paletteId}
            aria-label="Like this palette"
            title="Like this palette"
          >
            {isLiked ? '❤️ Liked' : '🤍 Like'}
          </button>
          <button
            onClick={handleRemix}
            className="action-button remix-button"
            disabled={loading || !paletteId}
            aria-label="Create a remix based on this palette"
            title="Create a remix of this palette"
          >
            🎨 Remix
          </button>
          <button
            onClick={handleCopyShareLink}
            className="action-button share-button"
            aria-label="Copy share link to clipboard"
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
