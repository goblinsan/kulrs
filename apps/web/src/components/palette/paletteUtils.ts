import { generateRandom, type GeneratedPalette } from '@kulrs/shared';

// Re-export the canonical oklchToHex from the shared utility
export { oklchToHex } from '../../utils/colorUtils';

// Generate a palette once at module load time for consistent SSR
export const initialPalette: GeneratedPalette = generateRandom();
