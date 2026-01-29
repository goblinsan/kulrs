import { useParams } from 'react-router-dom';
import { type GeneratedPalette } from '@kulrs/shared';
import { PaletteDisplay } from '../components/palette/PaletteDisplay';
import './PaletteDetail.css';

export function PaletteDetail() {
  const { id } = useParams<{ id: string }>();

  let palette: GeneratedPalette | null = null;
  let error: string | null = null;

  try {
    if (id) {
      const decoded = decodeURIComponent(id);
      palette = JSON.parse(decoded);
    }
  } catch (e) {
    error = 'Invalid palette data';
    console.error('Error parsing palette data:', e);
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
        alert('Share link copied to clipboard!');
      })
      .catch(error => {
        console.error('Failed to copy to clipboard:', error);
        alert('Failed to copy link. Please copy the URL manually.');
      });
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
        <button onClick={handleCopyShareLink} className="share-button">
          📋 Copy Share Link
        </button>
      </div>

      <PaletteDisplay palette={palette} showControls={true} />
    </div>
  );
}
