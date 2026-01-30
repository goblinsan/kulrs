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
  return new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
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
    const error = await response
      .json()
      .catch(() => ({ message: 'Unknown error' }));
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

/**
 * DELETE request helper
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
  });
}

// Palette API types
export interface CreatePaletteRequest {
  name: string;
  description?: string;
  colors: Array<{
    hexValue: string;
    position: number;
    name?: string;
  }>;
  isPublic?: boolean;
  sourceId?: string;
  tagIds?: string[];
}

export interface PaletteResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    description: string | null;
    userId: string;
    sourceId: string | null;
    isPublic: boolean;
    likesCount: number;
    savesCount: number;
    createdAt: string;
    updatedAt: string;
  };
}

export interface SaveLikeResponse {
  success: boolean;
  data: {
    alreadySaved?: boolean;
    alreadyLiked?: boolean;
    wasLiked?: boolean;
    likesCount?: number;
  };
}

export interface LikeInfoResponse {
  success: boolean;
  data: {
    likesCount: number;
    userLiked: boolean;
  };
}

/**
 * Create a new palette
 */
export async function createPalette(
  data: CreatePaletteRequest
): Promise<PaletteResponse> {
  return apiPost<PaletteResponse>('/palettes', data);
}

/**
 * Save a palette to user's collection
 */
export async function savePalette(
  paletteId: string
): Promise<SaveLikeResponse> {
  return apiPost<SaveLikeResponse>(`/palettes/${paletteId}/save`, {});
}

/**
 * Like a palette
 */
export async function likePalette(
  paletteId: string
): Promise<SaveLikeResponse> {
  return apiPost<SaveLikeResponse>(`/palettes/${paletteId}/like`, {});
}

/**
 * Unlike a palette
 */
export async function unlikePalette(
  paletteId: string
): Promise<SaveLikeResponse> {
  return apiDelete<SaveLikeResponse>(`/palettes/${paletteId}/like`);
}

/**
 * Get like info for a palette (count and user's like status)
 */
export async function getLikeInfo(
  paletteId: string
): Promise<LikeInfoResponse> {
  return apiGet<LikeInfoResponse>(`/palettes/${paletteId}/likes`);
}

/**
 * Remix a palette (create a derived palette that tracks its relationship to the original)
 */
export async function remixPalette(
  paletteId: string
): Promise<PaletteResponse> {
  return apiPost<PaletteResponse>(`/palettes/${paletteId}/remix`, {});
}
