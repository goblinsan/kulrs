import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <Link to="/browse" onClick={closeMobileMenu}>
              Browse
            </Link>
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
