/**
 * Higher-level style theme definitions for palette browsing and recommendation.
 *
 * Each theme groups one or more low-level tag slugs that are used to filter
 * palettes in the database.  Themes are an application-layer concept and are
 * not stored in the database — they act as aliases for tag-based queries.
 */

export type ThemeCategory = 'colors' | 'styles' | 'topics';

export interface ThemeDefinition {
  /** URL-safe identifier used in query parameters */
  slug: string;
  /** Human-readable display name */
  label: string;
  /** Short description for UI display */
  description: string;
  /** Category grouping for UI display */
  category: ThemeCategory;
  /**
   * One or more tag slugs that palettes matching this theme should have at
   * least one of.  Corresponds to `tags.slug` values in the database.
   */
  tagSlugs: string[];
  /** Optional dot color swatch for color-category themes (CSS color value) */
  swatch?: string;
}

/**
 * Canonical list of style themes available for palette filtering.
 */
export const THEMES: ThemeDefinition[] = [
  // ── Colors ──────────────────────────────────────────────────────────
  { slug: 'red', label: 'Red', description: 'Palettes dominated by red hues', category: 'colors', tagSlugs: ['red'], swatch: '#E53935' },
  { slug: 'orange', label: 'Orange', description: 'Palettes dominated by orange hues', category: 'colors', tagSlugs: ['orange'], swatch: '#FB8C00' },
  { slug: 'brown', label: 'Brown', description: 'Palettes dominated by brown and earth tones', category: 'colors', tagSlugs: ['brown'], swatch: '#795548' },
  { slug: 'yellow', label: 'Yellow', description: 'Palettes dominated by yellow hues', category: 'colors', tagSlugs: ['yellow'], swatch: '#FDD835' },
  { slug: 'green', label: 'Green', description: 'Palettes dominated by green hues', category: 'colors', tagSlugs: ['green'], swatch: '#43A047' },
  { slug: 'turquoise', label: 'Turquoise', description: 'Palettes dominated by turquoise and teal hues', category: 'colors', tagSlugs: ['turquoise'], swatch: '#26C6DA' },
  { slug: 'blue', label: 'Blue', description: 'Palettes dominated by blue hues', category: 'colors', tagSlugs: ['blue'], swatch: '#1E88E5' },
  { slug: 'violet', label: 'Violet', description: 'Palettes dominated by violet and purple hues', category: 'colors', tagSlugs: ['violet'], swatch: '#8E24AA' },
  { slug: 'pink', label: 'Pink', description: 'Palettes dominated by pink hues', category: 'colors', tagSlugs: ['pink'], swatch: '#EC407A' },
  { slug: 'gray', label: 'Gray', description: 'Palettes dominated by gray tones', category: 'colors', tagSlugs: ['gray'], swatch: '#9E9E9E' },
  { slug: 'black', label: 'Black', description: 'Palettes dominated by black and very dark tones', category: 'colors', tagSlugs: ['black'], swatch: '#212121' },
  { slug: 'white', label: 'White', description: 'Palettes dominated by white and very light tones', category: 'colors', tagSlugs: ['white'], swatch: '#F5F5F5' },

  // ── Styles ──────────────────────────────────────────────────────────
  { slug: 'warm', label: 'Warm', description: 'Cozy, inviting palettes built around warm hues', category: 'styles', tagSlugs: ['warm'] },
  { slug: 'cold', label: 'Cold', description: 'Crisp, icy palettes built around cool hues', category: 'styles', tagSlugs: ['cool'] },
  { slug: 'bright', label: 'Bright', description: 'Vivid, high-saturation palettes', category: 'styles', tagSlugs: ['bright'] },
  { slug: 'dark', label: 'Dark', description: 'Deep, dramatic palettes with low lightness values', category: 'styles', tagSlugs: ['dark'] },
  { slug: 'pastel', label: 'Pastel', description: 'Soft, gentle palettes with high lightness and low chroma', category: 'styles', tagSlugs: ['pastel'] },
  { slug: 'vintage', label: 'Vintage', description: 'Retro, desaturated palettes with a nostalgic feel', category: 'styles', tagSlugs: ['vintage'] },
  { slug: 'monochromatic', label: 'Monochromatic', description: 'Single-hue palettes with varied lightness and saturation', category: 'styles', tagSlugs: ['monochromatic'] },
  { slug: 'gradient', label: 'Gradient', description: 'Smoothly transitioning color palettes', category: 'styles', tagSlugs: ['gradient'] },
  { slug: 'rainbow', label: 'Rainbow', description: 'Full-spectrum palettes spanning the color wheel', category: 'styles', tagSlugs: ['rainbow'] },
  { slug: '2-colors', label: '2 Colors', description: 'Minimal two-color palettes', category: 'styles', tagSlugs: ['2-colors'] },
  { slug: '3-colors', label: '3 Colors', description: 'Compact three-color palettes', category: 'styles', tagSlugs: ['3-colors'] },
  { slug: '4-colors', label: '4 Colors', description: 'Balanced four-color palettes', category: 'styles', tagSlugs: ['4-colors'] },
  { slug: '5-colors', label: '5 Colors', description: 'Classic five-color palettes', category: 'styles', tagSlugs: ['5-colors'] },
  { slug: '6-colors', label: '6 Colors', description: 'Extended six-color palettes', category: 'styles', tagSlugs: ['6-colors'] },
  { slug: '7-colors', label: '7 Colors', description: 'Seven-color palettes', category: 'styles', tagSlugs: ['7-colors'] },
  { slug: '8-colors', label: '8 Colors', description: 'Eight-color palettes', category: 'styles', tagSlugs: ['8-colors'] },
  { slug: '9-colors', label: '9 Colors', description: 'Nine-color palettes', category: 'styles', tagSlugs: ['9-colors'] },
  { slug: '10-colors', label: '10 Colors', description: 'Ten-color palettes', category: 'styles', tagSlugs: ['10-colors'] },

  // ── Topics ──────────────────────────────────────────────────────────
  { slug: 'christmas', label: 'Christmas', description: 'Festive red, green, gold, and white palettes', category: 'topics', tagSlugs: ['christmas'] },
  { slug: 'halloween', label: 'Halloween', description: 'Spooky orange, black, and purple palettes', category: 'topics', tagSlugs: ['halloween'] },
  { slug: 'pride', label: 'Pride', description: 'Vibrant rainbow and pride flag inspired palettes', category: 'topics', tagSlugs: ['pride'] },
  { slug: 'sunset', label: 'Sunset', description: 'Warm gradients inspired by sunsets', category: 'topics', tagSlugs: ['sunset'] },
  { slug: 'spring', label: 'Spring', description: 'Fresh, floral palettes inspired by spring', category: 'topics', tagSlugs: ['spring'] },
  { slug: 'winter', label: 'Winter', description: 'Cool, icy palettes inspired by winter', category: 'topics', tagSlugs: ['winter'] },
  { slug: 'summer', label: 'Summer', description: 'Bright, warm palettes inspired by summer', category: 'topics', tagSlugs: ['summer'] },
  { slug: 'autumn', label: 'Autumn', description: 'Rich, warm palettes inspired by fall foliage', category: 'topics', tagSlugs: ['autumn'] },
  { slug: 'gold', label: 'Gold', description: 'Luxurious gold, amber, and metallic palettes', category: 'topics', tagSlugs: ['gold'] },
  { slug: 'wedding', label: 'Wedding', description: 'Elegant, romantic palettes for weddings', category: 'topics', tagSlugs: ['wedding'] },
  { slug: 'party', label: 'Party', description: 'Fun, energetic palettes for celebrations', category: 'topics', tagSlugs: ['party'] },
  { slug: 'space', label: 'Space', description: 'Deep cosmic palettes inspired by outer space', category: 'topics', tagSlugs: ['space'] },
  { slug: 'kids', label: 'Kids', description: 'Playful, cheerful palettes for children', category: 'topics', tagSlugs: ['kids'] },
  { slug: 'nature', label: 'Nature', description: 'Earthy, organic palettes inspired by the natural world', category: 'topics', tagSlugs: ['nature'] },
  { slug: 'city', label: 'City', description: 'Urban, modern palettes inspired by city life', category: 'topics', tagSlugs: ['city'] },
  { slug: 'food', label: 'Food', description: 'Appetizing palettes inspired by food and drinks', category: 'topics', tagSlugs: ['food'] },
  { slug: 'happy', label: 'Happy', description: 'Uplifting, joyful palettes', category: 'topics', tagSlugs: ['happy'] },
  { slug: 'water', label: 'Water', description: 'Aquatic palettes inspired by oceans, rivers, and rain', category: 'topics', tagSlugs: ['water'] },
  { slug: 'relax', label: 'Relax', description: 'Calming, soothing palettes for relaxation', category: 'topics', tagSlugs: ['relax'] },
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

/**
 * Return themes filtered by category.
 */
export function listThemesByCategory(category: ThemeCategory): ThemeDefinition[] {
  return THEMES.filter((t) => t.category === category);
}
