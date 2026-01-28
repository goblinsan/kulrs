import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';

let firebaseInitialized = false;

export function initializeFirebase() {
  if (!firebaseInitialized) {
    // In production, credentials are loaded from environment variables
    // In local development, use Application Default Credentials
    if (process.env.NODE_ENV === 'production') {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      // For local development, use Application Default Credentials
      admin.initializeApp();
    }
    firebaseInitialized = true;
  }
  return admin;
}

export function getAuth(): Auth {
  if (!firebaseInitialized) {
    initializeFirebase();
  }
  return admin.auth();
}
