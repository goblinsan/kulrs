import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FontPicker } from '../components/FontPicker';
import './Design.css';

// ── Types ───────────────────────────────────────────────────────────
type TemplateId = 'top-nav' | 'left-nav' | 'mobile' | 'dashboard' | 'landing';
type ThemeMode = 'light' | 'dark' | 'custom';

interface DesignTemplate {
  id: TemplateId;
  label: string;
  description: string;
}

// ── Constants ───────────────────────────────────────────────────────
const TEMPLATES: DesignTemplate[] = [
  {
    id: 'top-nav',
    label: 'Web — Top Nav',
    description: 'Classic website with horizontal navigation bar',
  },
  {
    id: 'left-nav',
    label: 'Web — Side Nav',
    description: 'App layout with vertical sidebar navigation',
  },
  {
    id: 'mobile',
    label: 'Mobile App',
    description: 'Phone layout with status bar and tab bar',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Admin dashboard with header and card grid',
  },
  {
    id: 'landing',
    label: 'Landing Page',
    description: 'Marketing page with hero and feature sections',
  },
];

const COLOR_ROLES: Record<TemplateId, string[]> = {
  'top-nav': ['Navigation', 'Hero / Banner', 'CTA Button', 'Accent', 'Accent'],
  'left-nav': [
    'Sidebar',
    'Primary Accent',
    'Card Highlight',
    'Card Highlight',
    'Accent',
  ],
  mobile: ['Status Bar / Nav', 'Accent / FAB', 'Card', 'Card', 'Accent'],
  dashboard: ['Header Bar', 'Accent', 'Stat Card', 'Stat Card', 'Accent'],
  landing: [
    'Brand / CTA',
    'Feature Icon',
    'Feature Icon',
    'Feature Icon',
    'Accent',
  ],
};

const LIGHT_BG: Record<TemplateId, string> = {
  'top-nav': '#f9fafb',
  'left-nav': '#f1f5f9',
  mobile: '#f9fafb',
  dashboard: '#f8fafc',
  landing: '#ffffff',
};

const DARK_BG: Record<TemplateId, string> = {
  'top-nav': '#1a1a2e',
  'left-nav': '#1e293b',
  mobile: '#1a1a2e',
  dashboard: '#0f172a',
  landing: '#111827',
};

// ── Helpers ─────────────────────────────────────────────────────────
function parseColorsFromParams(sp: URLSearchParams): string[] | null {
  const raw = sp.get('colors');
  if (raw) {
    return raw
      .split(',')
      .map(v => (v.startsWith('#') ? v : `#${v}`))
      .filter(v => /^#[0-9a-fA-F]{6}$/.test(v));
  }
  try {
    const stored = sessionStorage.getItem('kulrs_palette_colors');
    if (stored) {
      const arr = JSON.parse(stored) as string[];
      if (Array.isArray(arr) && arr.length > 0)
        return arr.filter(v => /^#[0-9a-fA-F]{6}$/i.test(v));
    }
  } catch {
    /* ignore */
  }
  return null;
}

function safeColor(colors: string[], idx: number): string {
  return colors[idx % colors.length] || '#888888';
}

function getContentBg(
  template: TemplateId,
  theme: ThemeMode,
  customBg: string
): string {
  if (theme === 'custom') return customBg;
  return theme === 'dark' ? DARK_BG[template] : LIGHT_BG[template];
}

function buildVizailUrl(
  colors: string[],
  headingFont: string,
  bodyFont: string,
  template: TemplateId,
  theme: ThemeMode,
  customBg: string
): string {
  const params = new URLSearchParams();
  params.set('colors', colors.map(c => c.replace('#', '')).join(','));
  params.set('headingFont', headingFont);
  params.set('bodyFont', bodyFont);
  params.set('template', template);
  if (theme !== 'light') params.set('theme', theme);
  if (theme === 'custom') params.set('bg', customBg.replace('#', ''));
  return `https://vizail.com/from-kulrs?${params.toString()}`;
}

function randomHex(): string {
  return (
    '#' +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
      .toUpperCase()
  );
}

// ── Mini preview components ─────────────────────────────────────────
interface PreviewProps {
  colors: string[];
  bgColor: string;
}

function PreviewTopNav({ colors, bgColor }: PreviewProps) {
  return (
    <div className="preview-top-nav">
      <div
        className="nav-bar"
        style={{ backgroundColor: safeColor(colors, 0) }}
      >
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="nav-item"
            style={{ backgroundColor: safeColor(colors, i) }}
          />
        ))}
      </div>
      <div className="body-area" style={{ backgroundColor: bgColor }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="content-line"
            style={{
              backgroundColor: safeColor(colors, i % colors.length),
              width: `${60 + ((i * 17) % 40)}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PreviewLeftNav({ colors, bgColor }: PreviewProps) {
  return (
    <div className="preview-left-nav">
      <div
        className="side-bar"
        style={{ backgroundColor: safeColor(colors, 0) }}
      >
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="side-item"
            style={{ backgroundColor: safeColor(colors, i) }}
          />
        ))}
      </div>
      <div className="main-area" style={{ backgroundColor: bgColor }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="content-line"
            style={{
              backgroundColor: safeColor(colors, i % colors.length),
              width: `${50 + ((i * 13) % 50)}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PreviewMobile({ colors, bgColor }: PreviewProps) {
  return (
    <div className="preview-mobile">
      <div className="phone-frame">
        <div
          className="phone-status"
          style={{ backgroundColor: safeColor(colors, 0) }}
        />
        <div className="phone-content" style={{ backgroundColor: bgColor }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="content-line"
              style={{
                backgroundColor: safeColor(colors, i % colors.length),
                width: `${55 + ((i * 11) % 45)}%`,
              }}
            />
          ))}
        </div>
        <div
          className="phone-tab-bar"
          style={{ backgroundColor: safeColor(colors, 0) }}
        >
          {colors.slice(0, 4).map((c, i) => (
            <div key={i} className="tab-item" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewDashboard({ colors, bgColor }: PreviewProps) {
  return (
    <div className="preview-dashboard">
      <div
        className="dash-header"
        style={{ backgroundColor: safeColor(colors, 0) }}
      >
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="header-item"
            style={{ backgroundColor: safeColor(colors, i) }}
          />
        ))}
      </div>
      <div className="dash-body" style={{ backgroundColor: bgColor }}>
        {colors.slice(0, 4).map((c, i) => (
          <div key={i} className="card" style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  );
}

function PreviewLanding({ colors, bgColor }: PreviewProps) {
  return (
    <div className="preview-landing">
      <div
        className="hero-section"
        style={{ backgroundColor: safeColor(colors, 0) }}
      >
        <div
          className="hero-title"
          style={{ backgroundColor: safeColor(colors, 1) }}
        />
        <div
          className="hero-btn"
          style={{ backgroundColor: safeColor(colors, 2) }}
        />
      </div>
      <div className="features-section" style={{ backgroundColor: bgColor }}>
        {colors.slice(0, 3).map((c, i) => (
          <div key={i} className="feature-box" style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  );
}

const PREVIEW_COMPONENTS: Record<TemplateId, React.FC<PreviewProps>> = {
  'top-nav': PreviewTopNav,
  'left-nav': PreviewLeftNav,
  mobile: PreviewMobile,
  dashboard: PreviewDashboard,
  landing: PreviewLanding,
};

// ── Main component ──────────────────────────────────────────────────
export function Design() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialColors = useMemo(
    () =>
      parseColorsFromParams(searchParams) ?? [
        '#FF5733',
        '#457B9D',
        '#1D3557',
        '#A8DADC',
        '#F1FAEE',
      ],
    [searchParams]
  );

  const [colors, setColors] = useState<string[]>(initialColors);
  const [headingFont, setHeadingFont] = useState('Inter');
  const [bodyFont, setBodyFont] = useState('Roboto');
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateId>('top-nav');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [customBg, setCustomBg] = useState('#ffffff');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  /* Keep sessionStorage in sync so nav-bar links carry the palette */
  useEffect(() => {
    if (colors.length > 0) {
      try {
        sessionStorage.setItem('kulrs_palette_colors', JSON.stringify(colors));
      } catch { /* ignore */ }
    }
  }, [colors]);

  const roles = COLOR_ROLES[selectedTemplate];

  // ── Color handlers ──────────────────────────────────────────────
  const updateColor = useCallback((idx: number, hex: string) => {
    setColors(prev => prev.map((c, i) => (i === idx ? hex.toUpperCase() : c)));
  }, []);

  const removeColor = useCallback((idx: number) => {
    setColors(prev =>
      prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)
    );
  }, []);

  const addColor = useCallback(() => {
    setColors(prev => (prev.length >= 8 ? prev : [...prev, randomHex()]));
  }, []);

  const handleReorder = useCallback((from: number, to: number) => {
    if (from === to) return;
    setColors(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  // ── Link handlers ─────────────────────────────────────────────
  const handleGenerate = () => {
    const url = buildVizailUrl(
      colors,
      headingFont,
      bodyFont,
      selectedTemplate,
      themeMode,
      customBg
    );
    setGeneratedLink(url);
    setCopied(false);
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenLink = () => {
    if (generatedLink) window.open(generatedLink, '_blank');
  };

  return (
    <div className="design-page">
      <h1>Design</h1>
      <p className="design-intro">
        Apply your palette to a design template and preview it on{' '}
        <a href="https://vizail.com" target="_blank" rel="noopener noreferrer">
          vizail.com
        </a>
        . Choose fonts, set a theme, pick a layout, and generate a link to see
        your colors in action.
      </p>

      {/* ── Palette Colors ─────────────────────────────────────── */}
      <div className="design-section">
        <h2>Palette Colors</h2>
        <p className="section-hint">
          Drag to reorder · Click swatch to edit · Roles update per layout
        </p>
        <div className="design-color-list">
          {colors.map((hex, i) => (
            <div
              key={i}
              className={`design-color-item${dragIdx === i ? ' dragging' : ''}${dragOverIdx === i ? ' drag-over' : ''}`}
              draggable
              onDragStart={e => {
                setDragIdx(i);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverIdx !== i) setDragOverIdx(i);
              }}
              onDragLeave={() => {
                if (dragOverIdx === i) setDragOverIdx(null);
              }}
              onDrop={e => {
                e.preventDefault();
                if (dragIdx != null) handleReorder(dragIdx, i);
                setDragIdx(null);
                setDragOverIdx(null);
              }}
              onDragEnd={() => {
                setDragIdx(null);
                setDragOverIdx(null);
              }}
            >
              <i className="fa-solid fa-grip-vertical design-drag-handle" />
              <label
                className="design-color-swatch"
                style={{ backgroundColor: hex }}
              >
                <input
                  type="color"
                  value={hex}
                  onChange={e => updateColor(i, e.target.value)}
                />
              </label>
              <span className="design-color-hex">{hex}</span>
              <span className="design-color-role">{roles[i] || 'Accent'}</span>
              {colors.length > 2 && (
                <button
                  className="design-color-remove"
                  onClick={() => removeColor(i)}
                  title="Remove color"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          ))}
          {colors.length < 8 && (
            <button className="design-add-color" onClick={addColor}>
              <i className="fa-solid fa-plus" /> Add Color
            </button>
          )}
        </div>
      </div>

      {/* ── Theme ──────────────────────────────────────────────── */}
      <div className="design-section">
        <h2>Theme</h2>
        <div className="theme-controls">
          <div className="theme-toggle">
            {(['light', 'dark', 'custom'] as ThemeMode[]).map(mode => (
              <button
                key={mode}
                className={`theme-btn${themeMode === mode ? ' active' : ''}`}
                onClick={() => setThemeMode(mode)}
              >
                <i
                  className={`fa-solid ${mode === 'light' ? 'fa-sun' : mode === 'dark' ? 'fa-moon' : 'fa-sliders'}`}
                />
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          {themeMode === 'custom' && (
            <div className="custom-bg-row">
              <span className="custom-bg-label">Background</span>
              <label
                className="custom-bg-swatch"
                style={{ backgroundColor: customBg }}
              >
                <input
                  type="color"
                  value={customBg}
                  onChange={e => setCustomBg(e.target.value)}
                />
              </label>
              <span className="custom-bg-hex">{customBg}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Fonts ──────────────────────────────────────────────── */}
      <div className="design-section">
        <h2>Fonts</h2>
        <div className="font-selector">
          <FontPicker
            label="Heading Font"
            value={headingFont}
            onChange={setHeadingFont}
            previewText="The quick brown fox"
          />
          <FontPicker
            label="Body Font"
            value={bodyFont}
            onChange={setBodyFont}
            previewText="Lorem ipsum dolor sit amet, consectetur"
          />
        </div>
        <div className="font-preview">
          <p
            className="font-preview-heading"
            style={{ fontFamily: headingFont }}
          >
            The quick brown fox — {headingFont}
          </p>
          <p className="font-preview-body" style={{ fontFamily: bodyFont }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. —{' '}
            {bodyFont}
          </p>
        </div>
      </div>

      {/* ── Layout Template ────────────────────────────────────── */}
      <div className="design-section">
        <h2>Layout Template</h2>
        <div className="template-grid">
          {TEMPLATES.map(tpl => {
            const Preview = PREVIEW_COMPONENTS[tpl.id];
            return (
              <div
                key={tpl.id}
                className={`template-card ${selectedTemplate === tpl.id ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate(tpl.id)}
                title={tpl.description}
              >
                <div className="template-preview">
                  <Preview
                    colors={colors}
                    bgColor={getContentBg(tpl.id, themeMode, customBg)}
                  />
                </div>
                <div className="template-label">
                  <span>{tpl.label}</span>
                  {selectedTemplate === tpl.id && (
                    <span className="check">
                      <i className="fa-solid fa-check"></i>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Generate Link ──────────────────────────────────────── */}
      <div className="generate-link-section">
        <button
          className="generate-link-button"
          onClick={handleGenerate}
          disabled={colors.length === 0}
        >
          Generate Vizail Link
        </button>

        {generatedLink && (
          <div className="generated-link-row">
            <input
              className="generated-link-input"
              value={generatedLink}
              readOnly
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button className="copy-link-button" onClick={handleCopy}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button className="copy-link-button" onClick={handleOpenLink}>
              Open{' '}
              <i
                className="fa-solid fa-arrow-up-right-from-square"
                style={{ marginLeft: 4 }}
              ></i>
            </button>
          </div>
        )}
      </div>

      {/* ── Navigate to other pages ────────────────────────────── */}
      <div className="design-nav-buttons">
        <button className="design-nav-btn" onClick={() => navigate(`/compose?colors=${colors.map(c => c.replace('#', '')).join(',')}`)}>
          <i className="fa-solid fa-music" /> Compose
        </button>
        <button className="design-nav-btn" onClick={() => navigate(`/pattern?colors=${colors.map(c => c.replace('#', '')).join(',')}`)}>
          <i className="fa-solid fa-shapes" /> Pattern
        </button>
        <button className="design-nav-btn" onClick={() => navigate('/scratch')}>
          <i className="fa-solid fa-pencil" /> Scratch
        </button>
      </div>
    </div>
  );
}
