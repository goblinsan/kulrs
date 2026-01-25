// Firebase initialization and configuration
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { firebase } from './env';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * Initialize Firebase with the configuration from environment variables
 * This should be called once at application startup
 */
export function initializeFirebase(): void {
  if (app) {
    console.warn('Firebase already initialized');
    return;
  }

  app = initializeApp(firebase);
  auth = getAuth(app);

  console.log('Firebase initialized successfully');
}

/**
 * Get the Firebase app instance
 * Throws an error if Firebase hasn't been initialized
 */
export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    throw new Error(
      'Firebase not initialized. Call initializeFirebase() first'
    );
  }
  return app;
}

/**
 * Get the Firebase Auth instance
 * Throws an error if Firebase hasn't been initialized
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    throw new Error(
      'Firebase not initialized. Call initializeFirebase() first'
    );
  }
  return auth;
}
