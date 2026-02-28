import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './FontPicker.css';

/* ── Font data with categories ───────────────────────────────────── */

export type FontCategory =
  | 'sans-serif'
  | 'serif'
  | 'display'
  | 'handwriting'
  | 'monospace';

export interface FontEntry {
  name: string;
  category: FontCategory;
}

/** Master list of curated Google Fonts with category tags. */
export const FONT_CATALOG: FontEntry[] = [
  // ── Sans-Serif ──
  { name: 'Inter', category: 'sans-serif' },
  { name: 'Roboto', category: 'sans-serif' },
  { name: 'Open Sans', category: 'sans-serif' },
  { name: 'Lato', category: 'sans-serif' },
  { name: 'Poppins', category: 'sans-serif' },
  { name: 'Montserrat', category: 'sans-serif' },
  { name: 'Nunito', category: 'sans-serif' },
  { name: 'Nunito Sans', category: 'sans-serif' },
  { name: 'Raleway', category: 'sans-serif' },
  { name: 'Work Sans', category: 'sans-serif' },
  { name: 'DM Sans', category: 'sans-serif' },
  { name: 'Manrope', category: 'sans-serif' },
  { name: 'Outfit', category: 'sans-serif' },
  { name: 'Figtree', category: 'sans-serif' },
  { name: 'Sora', category: 'sans-serif' },
  { name: 'Lexend', category: 'sans-serif' },
  { name: 'Plus Jakarta Sans', category: 'sans-serif' },
  { name: 'Cabin', category: 'sans-serif' },
  { name: 'Rubik', category: 'sans-serif' },
  { name: 'Karla', category: 'sans-serif' },
  { name: 'Mulish', category: 'sans-serif' },
  { name: 'Quicksand', category: 'sans-serif' },
  { name: 'Space Grotesk', category: 'sans-serif' },
  { name: 'Red Hat Display', category: 'sans-serif' },
  { name: 'Red Hat Text', category: 'sans-serif' },
  { name: 'Fira Sans', category: 'sans-serif' },
  { name: 'IBM Plex Sans', category: 'sans-serif' },
  { name: 'PT Sans', category: 'sans-serif' },
  { name: 'Libre Franklin', category: 'sans-serif' },
  { name: 'Noto Sans', category: 'sans-serif' },
  { name: 'Hind', category: 'sans-serif' },
  { name: 'Exo 2', category: 'sans-serif' },
  { name: 'Geologica', category: 'sans-serif' },
  { name: 'Josefin Sans', category: 'sans-serif' },
  { name: 'Titillium Web', category: 'sans-serif' },
  { name: 'Ubuntu', category: 'sans-serif' },
  { name: 'Source Sans 3', category: 'sans-serif' },
  { name: 'Comfortaa', category: 'sans-serif' },
  { name: 'Philosopher', category: 'sans-serif' },

  // ── Serif ──
  { name: 'Playfair Display', category: 'serif' },
  { name: 'Lora', category: 'serif' },
  { name: 'Merriweather', category: 'serif' },
  { name: 'EB Garamond', category: 'serif' },
  { name: 'Libre Baskerville', category: 'serif' },
  { name: 'Crimson Text', category: 'serif' },
  { name: 'Cormorant Garamond', category: 'serif' },
  { name: 'Spectral', category: 'serif' },
  { name: 'Bitter', category: 'serif' },
  { name: 'Vollkorn', category: 'serif' },
  { name: 'Noto Serif', category: 'serif' },
  { name: 'PT Serif', category: 'serif' },
  { name: 'Source Serif 4', category: 'serif' },
  { name: 'Roboto Slab', category: 'serif' },
  { name: 'Zilla Slab', category: 'serif' },
  { name: 'DM Serif Display', category: 'serif' },

  // ── Display ──
  { name: 'Oswald', category: 'display' },
  { name: 'Bebas Neue', category: 'display' },
  { name: 'Yanone Kaffeesatz', category: 'display' },
  { name: 'Abril Fatface', category: 'display' },
  { name: 'Righteous', category: 'display' },
  { name: 'Bungee', category: 'display' },
  { name: 'Passion One', category: 'display' },
  { name: 'Permanent Marker', category: 'display' },
  { name: 'Alfa Slab One', category: 'display' },
  { name: 'Fredoka', category: 'display' },
  { name: 'Baloo 2', category: 'display' },
  { name: 'Staatliches', category: 'display' },

  // ── Handwriting ──
  { name: 'Pacifico', category: 'handwriting' },
  { name: 'Satisfy', category: 'handwriting' },
  { name: 'Dancing Script', category: 'handwriting' },
  { name: 'Great Vibes', category: 'handwriting' },
  { name: 'Caveat', category: 'handwriting' },
  { name: 'Kalam', category: 'handwriting' },
  { name: 'Patrick Hand', category: 'handwriting' },
  { name: 'Sacramento', category: 'handwriting' },
  { name: 'Indie Flower', category: 'handwriting' },
  { name: 'Shadows Into Light', category: 'handwriting' },
  { name: 'Amatic SC', category: 'handwriting' },
  { name: 'Architects Daughter', category: 'handwriting' },

  // ── Monospace ──
  { name: 'Space Mono', category: 'monospace' },
  { name: 'Roboto Mono', category: 'monospace' },
  { name: 'Fira Code', category: 'monospace' },
  { name: 'JetBrains Mono', category: 'monospace' },
  { name: 'IBM Plex Mono', category: 'monospace' },
  { name: 'Source Code Pro', category: 'monospace' },
  { name: 'Inconsolata', category: 'monospace' },
  { name: 'Ubuntu Mono', category: 'monospace' },
];

const CATEGORY_LABELS: { id: FontCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: 'fa-solid fa-font' },
  { id: 'sans-serif', label: 'Sans-Serif', icon: 'fa-solid fa-a' },
  { id: 'serif', label: 'Serif', icon: 'fa-solid fa-feather' },
  { id: 'display', label: 'Display', icon: 'fa-solid fa-heading' },
  { id: 'handwriting', label: 'Hand', icon: 'fa-solid fa-pen-fancy' },
  { id: 'monospace', label: 'Mono', icon: 'fa-solid fa-code' },
];

/* ── Font loading with IntersectionObserver ──────────────────────── */

const loadedFonts = new Set<string>();

function ensureFontLoaded(fontName: string) {
  if (loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);

  const family = fontName.replace(/ /g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;600;700&display=swap`;

  const existing = document.querySelector(`link[href="${href}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

/* ── FontRow: loads font when visible ────────────────────────────── */

function FontRow({
  font,
  selected,
  previewText,
  onClick,
}: {
  font: FontEntry;
  selected: boolean;
  previewText: string;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (visible) ensureFontLoaded(font.name);
  }, [visible, font.name]);

  return (
    <button
      ref={ref}
      className={`font-row ${selected ? 'font-row-selected' : ''}`}
      onClick={onClick}
      type="button"
    >
      <div className="font-row-info">
        <span className="font-row-name">{font.name}</span>
        <span className="font-row-category">{font.category}</span>
      </div>
      <div
        className="font-row-preview"
        style={{ fontFamily: visible ? `'${font.name}', sans-serif` : 'inherit' }}
      >
        {visible ? previewText : '...'}
      </div>
      {selected && (
        <span className="font-row-check">
          <i className="fa-solid fa-check"></i>
        </span>
      )}
    </button>
  );
}

/* ── FontPicker component ────────────────────────────────────────── */

interface FontPickerProps {
  label: string;
  value: string;
  onChange: (fontName: string) => void;
  previewText?: string;
}

export function FontPicker({
  label,
  value,
  onChange,
  previewText = 'The quick brown fox jumps over the lazy dog',
}: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FontCategory | 'all'>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleToggle = useCallback(() => {
    setOpen(prev => !prev);
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const filtered = useMemo(() => {
    let list = FONT_CATALOG;
    if (category !== 'all') {
      list = list.filter(f => f.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }
    return list;
  }, [category, search]);

  // Ensure selected font is loaded for the trigger preview
  useEffect(() => {
    ensureFontLoaded(value);
  }, [value]);

  return (
    <div className="font-picker" ref={containerRef}>
      <span className="font-picker-label">{label}</span>
      <button
        className="font-picker-trigger"
        onClick={handleToggle}
        type="button"
      >
        <span
          className="font-picker-trigger-preview"
          style={{ fontFamily: `'${value}', sans-serif` }}
        >
          {value}
        </span>
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'} font-picker-arrow`}></i>
      </button>

      {open && (
        <div className="font-picker-dropdown">
          <div className="font-picker-search">
            <i className="fa-solid fa-search font-picker-search-icon"></i>
            <input
              ref={searchInputRef}
              type="text"
              className="font-picker-search-input"
              placeholder="Search fonts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="font-picker-search-clear"
                onClick={() => setSearch('')}
                type="button"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          <div className="font-picker-categories">
            {CATEGORY_LABELS.map(cat => (
              <button
                key={cat.id}
                className={`font-picker-cat ${category === cat.id ? 'font-picker-cat-active' : ''}`}
                onClick={() => setCategory(cat.id)}
                type="button"
                title={cat.label}
              >
                <i className={cat.icon}></i>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="font-picker-list">
            {filtered.length === 0 ? (
              <div className="font-picker-empty">No fonts match your search</div>
            ) : (
              filtered.map(f => (
                <FontRow
                  key={f.name}
                  font={f}
                  selected={f.name === value}
                  previewText={previewText}
                  onClick={() => {
                    onChange(f.name);
                    setOpen(false);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
