import { useState } from 'react';
import { type GeneratedPalette } from '@kulrs/shared';
import {
  createPalette,
  savePalette as savePaletteApi,
  likePalette as likePaletteApi,
  remixPalette as remixPaletteApi,
  type CreatePaletteRequest,
} from '../services/api';
import { oklchToHex } from '../components/palette/paletteUtils';

export function usePaletteActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Convert GeneratedPalette to CreatePaletteRequest
   */
  const paletteToRequest = (
    palette: GeneratedPalette
  ): CreatePaletteRequest => {
    return {
      name: `${palette.metadata.generator} palette`,
      description: palette.metadata.explanation,
      colors: palette.colors.map((color, index) => ({
        hexValue: oklchToHex(color.color),
        position: index,
        name: color.role,
      })),
      isPublic: true,
    };
  };

  /**
   * Save a palette to the database and return its ID
   */
  const savePaletteToDb = async (
    palette: GeneratedPalette
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const request = paletteToRequest(palette);
      const response = await createPalette(request);
      return response.data.id;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save palette';
      setError(message);
      console.error('Error saving palette:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save/bookmark a palette
   */
  const saveExistingPalette = async (
    paletteId: string
  ): Promise<{ success: boolean; alreadySaved?: boolean }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await savePaletteApi(paletteId);
      return {
        success: true,
        alreadySaved: response.data.alreadySaved,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save palette';
      setError(message);
      console.error('Error saving palette:', err);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Like a palette
   */
  const likePalette = async (
    paletteId: string
  ): Promise<{ success: boolean; alreadyLiked?: boolean }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await likePaletteApi(paletteId);
      return {
        success: true,
        alreadyLiked: response.data.alreadyLiked,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to like palette';
      setError(message);
      console.error('Error liking palette:', err);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remix a palette
   */
  const remixPalette = async (paletteId: string): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await remixPaletteApi(paletteId);
      return response.data.id;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to remix palette';
      setError(message);
      console.error('Error remixing palette:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    savePaletteToDb,
    saveExistingPalette,
    likePalette,
    remixPalette,
  };
}
