/**
 * Higher-level style theme definitions for palette browsing and recommendation.
 *
 * Each theme groups one or more low-level tag slugs that are used to filter
 * palettes in the database.  Themes are an application-layer concept and are
 * not stored in the database — they act as aliases for tag-based queries.
 */

export interface ThemeDefinition {
  /** URL-safe identifier used in query parameters */
  slug: string;
  /** Human-readable display name */
  label: string;
  /** Short description for UI display */
  description: string;
  /**
   * One or more tag slugs that palettes matching this theme should have at
   * least one of.  Corresponds to `tags.slug` values in the database.
   */
  tagSlugs: string[];
}

/**
 * Canonical list of style themes available for palette filtering.
 */
export const THEMES: ThemeDefinition[] = [
  {
    slug: 'minimalist',
    label: 'Minimalist',
    description: 'Clean, understated palettes with muted or light tones',
    tagSlugs: ['muted', 'light', 'neutral-tone'],
  },
  {
    slug: 'vibrant',
    label: 'Vibrant',
    description: 'Bold, energetic palettes with high chroma and saturation',
    tagSlugs: ['vibrant'],
  },
  {
    slug: 'dark',
    label: 'Dark',
    description: 'Deep, dramatic palettes with low lightness values',
    tagSlugs: ['dark'],
  },
  {
    slug: 'warm',
    label: 'Warm',
    description: 'Cozy, inviting palettes built around warm hues',
    tagSlugs: ['warm'],
  },
  {
    slug: 'cool',
    label: 'Cool',
    description: 'Fresh, calming palettes built around cool hues',
    tagSlugs: ['cool'],
  },
  {
    slug: 'nature',
    label: 'Nature',
    description: 'Earthy, organic palettes inspired by the natural world',
    tagSlugs: ['nature'],
  },
  {
    slug: 'accessible',
    label: 'Accessible',
    description: 'WCAG-compliant palettes designed for inclusive interfaces',
    tagSlugs: ['accessible'],
  },
  {
    slug: 'pastel',
    label: 'Pastel',
    description: 'Soft, gentle palettes with high lightness and low chroma',
    tagSlugs: ['light', 'muted'],
  },
  {
    slug: 'monochromatic',
    label: 'Monochromatic',
    description: 'Single-hue palettes with varied lightness and saturation',
    tagSlugs: ['analogous', 'neutral-tone'],
  },
  {
    slug: 'complementary',
    label: 'Complementary',
    description: 'High-contrast palettes using opposite hues on the color wheel',
    tagSlugs: ['complementary', 'high-contrast'],
  },
];

/**
 * Look up a theme definition by its slug.
 * Returns `undefined` when no matching theme is found.
 */
export function getThemeBySlug(slug: string): ThemeDefinition | undefined {
  return THEMES.find((t) => t.slug === slug);
}

/**
 * Return the complete list of available themes.
 */
export function listThemes(): ThemeDefinition[] {
  return THEMES;
}
