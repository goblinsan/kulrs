import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  browsePalettes,
  getMyPalettes,
  likePalette,
  unlikePalette,
  deletePalette,
  type BrowsePalette,
} from '../services/api';
import { THEMES, type ThemeCategory } from '@kulrs/shared';
import { useAuth } from '../contexts/AuthContext';
import './Browse.css';

function CopyIdButton({ paletteId }: { paletteId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(paletteId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      className="copy-id-button"
      onClick={handleCopy}
      title={`Copy palette ID: ${paletteId}`}
    >
      {copied ? '✓ Copied' : 'Copy ID'}
    </button>
  );
}

function LikeButton({
  paletteId,
  initialCount,
  initialLiked,
}: {
  paletteId: string;
  initialCount: number;
  initialLiked: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLiked = !liked;
    setLiked(newLiked);
    setCount(prev => (newLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      if (newLiked) {
        const result = await likePalette(paletteId);
        if (result.data.likesCount !== undefined)
          setCount(result.data.likesCount);
      } else {
        const result = await unlikePalette(paletteId);
        if (result.data.likesCount !== undefined)
          setCount(result.data.likesCount);
      }
    } catch {
      setLiked(!newLiked);
      setCount(prev => (newLiked ? Math.max(0, prev - 1) : prev + 1));
    }
  };

  return (
    <button
      className={`browse-like-button ${liked ? 'liked' : ''}`}
      onClick={handleClick}
      title={liked ? 'Unlike' : 'Like'}
    >
      <i className={`fa-${liked ? 'solid' : 'regular'} fa-heart`}></i>
      {count > 0 ? ` ${count}` : ''}
    </button>
  );
}

type FilterType = 'recent' | 'popular' | 'my';

const THEME_CATEGORIES: { key: ThemeCategory; label: string }[] = [
  { key: 'colors', label: 'Colors' },
  { key: 'themes', label: 'Themes' },
];

export function Browse() {
  const [palettes, setPalettes] = useState<BrowsePalette[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const filter = (searchParams.get('filter') as FilterType) || 'recent';
  const activeTheme = searchParams.get('theme') || null;
  const searchQuery = searchParams.get('q') || '';

  const themesByCategory = useMemo(() => {
    const map: Record<ThemeCategory, typeof THEMES> = {
      colors: [],
      themes: [],
    };
    for (const t of THEMES) {
      map[t.category].push(t);
    }
    return map;
  }, []);

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
          theme: activeTheme ?? undefined,
          q: searchQuery || undefined,
        });
      }
      setPalettes(result.data);
    } catch (err) {
      console.error('Error loading palettes:', err);
      setError('Failed to load palettes');
    } finally {
      setLoading(false);
    }
  }, [filter, user, activeTheme, searchQuery]);

  useEffect(() => {
    loadPalettes();
  }, [loadPalettes]);

  const handleFilterChange = (newFilter: FilterType) => {
    if (newFilter === filter) return;
    const params: Record<string, string> = { filter: newFilter };
    if (activeTheme) params.theme = activeTheme;
    if (searchQuery) params.q = searchQuery;
    setSearchParams(params);
  };

  const handleThemeClick = (slug: string) => {
    const params: Record<string, string> = { filter };
    if (activeTheme === slug) {
      // Deselect theme
      if (searchQuery) params.q = searchQuery;
    } else {
      params.theme = slug;
      if (searchQuery) params.q = searchQuery;
    }
    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = (formData.get('q') as string)?.trim() || '';
    const params: Record<string, string> = { filter };
    if (activeTheme) params.theme = activeTheme;
    if (q) params.q = q;
    setSearchParams(params);
  };

  const clearSearch = () => {
    const params: Record<string, string> = { filter };
    if (activeTheme) params.theme = activeTheme;
    setSearchParams(params);
  };

  const handlePaletteClick = (palette: BrowsePalette) => {
    // Navigate to palette detail using the palette ID
    navigate(`/palette/${palette.id}`);
  };

  const handleDeletePalette = async (
    e: React.MouseEvent,
    paletteId: string
  ) => {
    e.stopPropagation();
    if (!window.confirm('Delete this palette? This cannot be undone.')) return;

    try {
      await deletePalette(paletteId);
      setPalettes(prev => prev.filter(p => p.id !== paletteId));
    } catch (err) {
      console.error('Error deleting palette:', err);
      alert('Failed to delete palette');
    }
  };

  return (
    <div className="browse-page">
      <div className="browse-header">
        <h1>Browse Palettes</h1>

        <form className="browse-search" onSubmit={handleSearch}>
          <input
            type="text"
            name="q"
            placeholder="Search palettes..."
            defaultValue={searchQuery}
            className="browse-search-input"
          />
          <button type="submit" className="browse-search-button">
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
          {searchQuery && (
            <button
              type="button"
              className="browse-search-clear"
              onClick={clearSearch}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </form>

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

        {filter !== 'my' && (
          <div className="browse-themes">
            {THEME_CATEGORIES.map(cat => (
              <div key={cat.key} className="theme-category">
                <h3 className="theme-category-label">{cat.label}</h3>
                <div className="theme-chips">
                  {themesByCategory[cat.key].map(theme => (
                    <button
                      key={theme.slug}
                      className={`theme-chip ${activeTheme === theme.slug ? 'active' : ''}`}
                      onClick={() => handleThemeClick(theme.slug)}
                      title={theme.description}
                    >
                      {theme.swatch && (
                        <span
                          className="theme-chip-swatch"
                          style={{ backgroundColor: theme.swatch }}
                        />
                      )}
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {(activeTheme || searchQuery) && (
          <div className="browse-active-filters">
            {activeTheme && (
              <span className="active-filter-tag">
                Theme:{' '}
                {THEMES.find(t => t.slug === activeTheme)?.label ?? activeTheme}
                <button onClick={() => handleThemeClick(activeTheme)}>×</button>
              </span>
            )}
            {searchQuery && (
              <span className="active-filter-tag">
                Search: {searchQuery}
                <button onClick={clearSearch}>×</button>
              </span>
            )}
          </div>
        )}
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

      {!loading && !error && filter === 'my' && !user && (
        <div className="browse-empty">
          <p>Log in to see your palettes.</p>
          <button onClick={() => navigate('/login')}>Log In</button>
        </div>
      )}

      {!loading &&
        !error &&
        palettes.length === 0 &&
        (filter !== 'my' || user) && (
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
                <div className="palette-stats">
                  <LikeButton
                    paletteId={palette.id}
                    initialCount={palette.likesCount}
                    initialLiked={palette.userLiked ?? false}
                  />
                  <CopyIdButton paletteId={palette.id} />
                  {filter === 'my' && (
                    <button
                      className="delete-palette-button"
                      onClick={e => handleDeletePalette(e, palette.id)}
                      title="Delete palette"
                    >
                      <i className="fa-regular fa-trash-can"></i>
                    </button>
                  )}
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
