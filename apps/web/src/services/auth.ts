// Authentication service using Firebase Auth
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  type User,
  type UserCredential,
  onAuthStateChanged,
  type Unsubscribe,
} from 'firebase/auth';
import { getFirebaseAuth } from '../config/firebase';

/**
 * Sign up a new user with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Sign in an existing user with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Sign in with Google provider
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

/**
 * Sign in with Apple provider
 */
export async function signInWithApple(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const provider = new OAuthProvider('apple.com');
  // Request additional scopes (email and name)
  provider.addScope('email');
  provider.addScope('name');
  return signInWithPopup(auth, provider);
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  return firebaseSignOut(auth);
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth.currentUser;
}

/**
 * Subscribe to authentication state changes
 * Returns an unsubscribe function
 */
export function onAuthChange(
  callback: (user: User | null) => void
): Unsubscribe {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}
