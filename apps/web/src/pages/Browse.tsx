import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  browsePalettes,
  getMyPalettes,
  type BrowsePalette,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Browse.css';

type FilterType = 'recent' | 'popular' | 'my';

export function Browse() {
  const [palettes, setPalettes] = useState<BrowsePalette[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const filter = (searchParams.get('filter') as FilterType) || 'recent';

  const loadPalettes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result;
      if (filter === 'my') {
        if (!user) {
          setPalettes([]);
          setLoading(false);
          return;
        }
        result = await getMyPalettes({ limit: 50 });
      } else {
        result = await browsePalettes({
          sort: filter === 'popular' ? 'popular' : 'recent',
          limit: 50,
        });
      }
      setPalettes(result.data);
    } catch (err) {
      console.error('Error loading palettes:', err);
      setError('Failed to load palettes');
    } finally {
      setLoading(false);
    }
  }, [filter, user]);

  useEffect(() => {
    loadPalettes();
  }, [loadPalettes]);

  const handleFilterChange = (newFilter: FilterType) => {
    if (newFilter === filter) return;
    if (newFilter === 'my' && !user) {
      navigate('/login');
      return;
    }
    setSearchParams({ filter: newFilter });
  };

  const handlePaletteClick = (palette: BrowsePalette) => {
    // Navigate to palette detail with colors encoded
    const paletteData = {
      colors: palette.colors.map((c, i) => ({
        role: c.name || `color${i}`,
        color: hexToOklch(c.hexValue),
      })),
      metadata: {
        generator: 'browse',
        explanation: palette.description || palette.name,
        timestamp: palette.createdAt,
      },
    };
    const encoded = encodeURIComponent(JSON.stringify(paletteData));
    navigate(`/palette/${encoded}`);
  };

  // Simple hex to oklch approximation for display
  function hexToOklch(hex: string): { l: number; c: number; h: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return { l, c: 0.15, h: 180 }; // Simplified
  }

  return (
    <div className="browse-page">
      <div className="browse-header">
        <h1>Browse Palettes</h1>
        <div className="browse-filters">
          <button
            className={`filter-button ${filter === 'recent' ? 'active' : ''}`}
            onClick={() => handleFilterChange('recent')}
          >
            Most Recent
          </button>
          <button
            className={`filter-button ${filter === 'popular' ? 'active' : ''}`}
            onClick={() => handleFilterChange('popular')}
          >
            Most Liked
          </button>
          <button
            className={`filter-button ${filter === 'my' ? 'active' : ''}`}
            onClick={() => handleFilterChange('my')}
          >
            My Palettes
          </button>
        </div>
      </div>

      {loading && (
        <div className="browse-loading">
          <p>Loading palettes...</p>
        </div>
      )}

      {error && (
        <div className="browse-error">
          <p>{error}</p>
          <button onClick={loadPalettes}>Retry</button>
        </div>
      )}

      {!loading && !error && palettes.length === 0 && (
        <div className="browse-empty">
          {filter === 'my' ? (
            <p>
              You haven't created any palettes yet. Go to the home page to
              create one!
            </p>
          ) : (
            <p>No palettes found.</p>
          )}
        </div>
      )}

      {!loading && !error && palettes.length > 0 && (
        <div className="palette-grid">
          {palettes.map(palette => (
            <div
              key={palette.id}
              className="palette-card"
              onClick={() => handlePaletteClick(palette)}
            >
              <div className="palette-colors">
                {palette.colors.slice(0, 5).map((color, index) => (
                  <div
                    key={color.id || index}
                    className="palette-color-strip"
                    style={{ backgroundColor: color.hexValue }}
                  />
                ))}
              </div>
              <div className="palette-info">
                <h3 className="palette-name">{palette.name}</h3>
                <div className="palette-stats">
                  <span className="likes">❤️ {palette.likesCount}</span>
                  <span className="date">
                    {new Date(palette.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
