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
  // Show error to user
  document.getElementById('root')!.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h1>Configuration Error</h1>
      <p>${error instanceof Error ? error.message : 'Failed to load environment configuration'}</p>
      <p>Please check your .env.local file and ensure all required Firebase variables are set.</p>
    </div>
  `;
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
