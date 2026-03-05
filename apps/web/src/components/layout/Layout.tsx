import { type ReactNode, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hexToOklch } from '../../utils/colorUtils';
import './Layout.css';

const PALETTE_ROLES = [
  'primary',
  'secondary',
  'accent',
  'info',
  'success',
  'warning',
  'error',
  'background',
] as const;

function buildDetailsUrl(pathname: string): string | null {
  if (pathname.startsWith('/palette/')) return null;
  try {
    const stored = sessionStorage.getItem('kulrs_palette_colors');
    if (!stored) return null;
    const hexColors = JSON.parse(stored) as string[];
    if (!Array.isArray(hexColors) || hexColors.length === 0) return null;
    const palette = {
      colors: hexColors.map((hex, i) => ({
        role: PALETTE_ROLES[i % PALETTE_ROLES.length],
        color: hexToOklch(hex),
      })),
      metadata: {
        generator: 'session',
        explanation: 'Current palette',
        timestamp: new Date().toISOString(),
      },
    };
    return `/palette/${encodeURIComponent(JSON.stringify(palette))}`;
  } catch {
    return null;
  }
}

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const detailsUrl = useMemo(
    () => buildDetailsUrl(location.pathname),
    [location.pathname]
  );

  const handleSignOut = async () => {
    try {
      await signOut();
      setMobileMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <nav className="layout-nav">
          <div className="nav-brand">
            <Link to="/" onClick={closeMobileMenu}>
              Kulrs
            </Link>
          </div>
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
          <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <Link to="/" onClick={closeMobileMenu}>
              Home
            </Link>
            <Link to="/browse" onClick={closeMobileMenu}>
              Browse
            </Link>
            <Link to="/compose" onClick={closeMobileMenu}>
              Compose
            </Link>
            <Link to="/pattern" onClick={closeMobileMenu}>
              Pattern
            </Link>
            <Link to="/scratch" onClick={closeMobileMenu}>
              Scratch
            </Link>
            <Link to="/design" onClick={closeMobileMenu}>
              Design
            </Link>
            {detailsUrl && (
              <Link
                to={detailsUrl}
                onClick={closeMobileMenu}
                title="View current palette details"
              >
                Details
              </Link>
            )}
            {user ? (
              <>
                <span className="nav-user" title={user.email || undefined}>
                  {user.email}
                </span>
                <button onClick={handleSignOut} className="nav-button">
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" onClick={closeMobileMenu}>
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </header>
      <main className="layout-main">{children}</main>
    </div>
  );
}
