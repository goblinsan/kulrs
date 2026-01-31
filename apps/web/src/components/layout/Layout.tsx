import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <nav className="layout-nav">
          <div className="nav-brand">
            <Link to="/">Kulrs</Link>
          </div>
          <div className="nav-links">
            <Link to="/browse">Browse</Link>
            {user ? (
              <>
                <span className="nav-user">{user.email}</span>
                <button onClick={handleSignOut} className="nav-button">
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/login">Sign In</Link>
            )}
          </div>
        </nav>
      </header>
      <main className="layout-main">{children}</main>
    </div>
  );
}
