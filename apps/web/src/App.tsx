import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { SignupForm } from './components/auth/SignupForm';
import { UserProfile } from './components/auth/UserProfile';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

type AuthMode = 'login' | 'signup';

function App() {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  if (loading) {
    return (
      <div className="app-loading">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (user) {
    return (
      <>
        <div>
          <a href="https://vite.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1>Welcome to Kulrs!</h1>
        <UserProfile />
        <p className="read-the-docs">
          Firebase Authentication is now integrated
        </p>
      </>
    );
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Kulrs</h1>
      <div className="card">
        {authMode === 'login' ? (
          <LoginForm onSwitchToSignup={() => setAuthMode('signup')} />
        ) : (
          <SignupForm onSwitchToLogin={() => setAuthMode('login')} />
        )}
      </div>
    </>
  );
}

export default App;
