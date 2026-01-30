import { getFirebaseAuth } from '../config/firebase';
import { apiUrl } from '../config/env';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Wait for Firebase auth to be ready and get the current user's ID token
 */
async function getAuthToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  
  // If currentUser exists, get token directly
  if (auth.currentUser) {
    return auth.currentUser.getIdToken();
  }
  
  // Otherwise wait for auth state to be determined
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        const token = await user.getIdToken();
        resolve(token);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * POST request helper
 */
export async function apiPost<T>(endpoint: string, data: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * GET request helper
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'GET',
  });
}
