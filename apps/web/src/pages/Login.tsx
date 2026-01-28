import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

type AuthMode = 'login' | 'signup';

export function Login() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Kulrs</h1>
        <p className="login-subtitle">
          {authMode === 'login' ? 'Sign in to your account' : 'Create a new account'}
        </p>
        <div className="login-form">
          {authMode === 'login' ? (
            <LoginForm onSwitchToSignup={() => setAuthMode('signup')} />
          ) : (
            <SignupForm onSwitchToLogin={() => setAuthMode('login')} />
          )}
        </div>
      </div>
    </div>
  );
}
