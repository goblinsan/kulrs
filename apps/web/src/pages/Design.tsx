import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FontPicker } from '../components/FontPicker';
import './Design.css';

// ── Design templates ────────────────────────────────────────────────
type TemplateId = 'top-nav' | 'left-nav' | 'mobile' | 'dashboard' | 'landing';

interface DesignTemplate {
  id: TemplateId;
  label: string;
  description: string;
}

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

function buildVizailUrl(
  colors: string[],
  headingFont: string,
  bodyFont: string,
  template: TemplateId
): string {
  const params = new URLSearchParams();
  params.set('colors', colors.map(c => c.replace('#', '')).join(','));
  params.set('headingFont', headingFont);
  params.set('bodyFont', bodyFont);
  params.set('template', template);
  return `https://vizail.com/from-kulrs?${params.toString()}`;
}

// ── Mini preview components ─────────────────────────────────────────
function PreviewTopNav({ colors }: { colors: string[] }) {
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
      <div className="body-area" style={{ backgroundColor: '#f9fafb' }}>
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

function PreviewLeftNav({ colors }: { colors: string[] }) {
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
      <div className="main-area" style={{ backgroundColor: '#f1f5f9' }}>
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

function PreviewMobile({ colors }: { colors: string[] }) {
  return (
    <div className="preview-mobile">
      <div className="phone-frame">
        <div
          className="phone-status"
          style={{ backgroundColor: safeColor(colors, 0) }}
        />
        <div className="phone-content" style={{ backgroundColor: '#f9fafb' }}>
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

function PreviewDashboard({ colors }: { colors: string[] }) {
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
      <div className="dash-body" style={{ backgroundColor: '#f8fafc' }}>
        {colors.slice(0, 4).map((c, i) => (
          <div key={i} className="card" style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  );
}

function PreviewLanding({ colors }: { colors: string[] }) {
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
      <div className="features-section" style={{ backgroundColor: '#ffffff' }}>
        {colors.slice(0, 3).map((c, i) => (
          <div key={i} className="feature-box" style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  );
}

const PREVIEW_COMPONENTS: Record<TemplateId, React.FC<{ colors: string[] }>> = {
  'top-nav': PreviewTopNav,
  'left-nav': PreviewLeftNav,
  mobile: PreviewMobile,
  dashboard: PreviewDashboard,
  landing: PreviewLanding,
};

// ── Main component ──────────────────────────────────────────────────
export function Design() {
  const [searchParams] = useSearchParams();

  const colors = useMemo(
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

  const [headingFont, setHeadingFont] = useState('Inter');
  const [bodyFont, setBodyFont] = useState('Roboto');

  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateId>('top-nav');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const url = buildVizailUrl(colors, headingFont, bodyFont, selectedTemplate);
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
        . Choose fonts, pick a layout, and generate a link to see your colors in
        action.
      </p>

      {/* Palette preview strip */}
      {colors.length > 0 ? (
        <div className="design-palette-strip">
          {colors.map((c, i) => (
            <div key={i} className="strip-color" style={{ backgroundColor: c }}>
              <span>{c}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="design-no-palette">
          Generate a palette on the home page first, then come back here.
        </div>
      )}

      {/* Font selection */}
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

      {/* Template selection */}
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
                  <Preview colors={colors} />
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

      {/* Generate link */}
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
    </div>
  );
}
