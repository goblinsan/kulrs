import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { validateEnv } from './config/env';
import { initializeFirebase } from './config/firebase';
import { AuthProvider } from './contexts/AuthContext';

// Validate environment variables
try {
  validateEnv();
} catch (error) {
  console.error('Environment validation failed:', error);
  // Show error to user (use textContent to avoid XSS)
  const root = document.getElementById('root')!;
  root.textContent = '';
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'padding: 2rem; text-align: center;';
  const h1 = document.createElement('h1');
  h1.textContent = 'Configuration Error';
  const p1 = document.createElement('p');
  p1.textContent =
    error instanceof Error
      ? error.message
      : 'Failed to load environment configuration';
  const p2 = document.createElement('p');
  p2.textContent =
    'Please check your .env.local file and ensure all required Firebase variables are set.';
  wrapper.append(h1, p1, p2);
  root.appendChild(wrapper);
  throw error;
}

// Initialize Firebase
initializeFirebase();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
