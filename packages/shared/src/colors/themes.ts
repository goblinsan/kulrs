/**
 * Higher-level style theme definitions for palette browsing and recommendation.
 *
 * Each theme groups one or more low-level tag slugs that are used to filter
 * palettes in the database.  Themes are an application-layer concept and are
 * not stored in the database — they act as aliases for tag-based queries.
 */

export type ThemeCategory = 'colors' | 'themes';

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

  // ── Themes (merged styles + topics) ─────────────────────────────────
  // Seasons & Holidays
  { slug: 'christmas', label: 'Christmas', description: 'Festive red, green, gold, and white palettes', category: 'themes', tagSlugs: ['christmas'] },
  { slug: 'halloween', label: 'Halloween', description: 'Spooky orange, black, and purple palettes', category: 'themes', tagSlugs: ['halloween'] },
  { slug: 'spring', label: 'Spring', description: 'Fresh, floral palettes inspired by spring', category: 'themes', tagSlugs: ['spring'] },
  { slug: 'summer', label: 'Summer', description: 'Bright, warm palettes inspired by summer', category: 'themes', tagSlugs: ['summer'] },
  { slug: 'autumn', label: 'Autumn', description: 'Rich, warm palettes inspired by fall foliage', category: 'themes', tagSlugs: ['autumn'] },
  { slug: 'winter', label: 'Winter', description: 'Cool, icy palettes inspired by winter', category: 'themes', tagSlugs: ['winter'] },

  // Moods & Styles
  { slug: 'sunset', label: 'Sunset', description: 'Warm gradients inspired by golden hour and dusk', category: 'themes', tagSlugs: ['sunset'] },
  { slug: 'ocean', label: 'Ocean', description: 'Deep blues and aqua tones from the sea', category: 'themes', tagSlugs: ['ocean'] },
  { slug: 'forest', label: 'Forest', description: 'Lush greens and earthy tones from the woods', category: 'themes', tagSlugs: ['forest'] },
  { slug: 'desert', label: 'Desert', description: 'Sandy, warm tones inspired by arid landscapes', category: 'themes', tagSlugs: ['desert'] },
  { slug: 'neon', label: 'Neon', description: 'Electric, glowing colors for bold designs', category: 'themes', tagSlugs: ['neon'] },
  { slug: 'pastel', label: 'Pastel', description: 'Soft, gentle palettes with high lightness', category: 'themes', tagSlugs: ['pastel'] },
  { slug: 'earth', label: 'Earth', description: 'Organic tones from clay, stone, and soil', category: 'themes', tagSlugs: ['earth'] },
  { slug: 'vintage', label: 'Vintage', description: 'Retro, desaturated palettes with a nostalgic feel', category: 'themes', tagSlugs: ['vintage'] },
  { slug: 'midnight', label: 'Midnight', description: 'Deep, moody palettes for dark interfaces', category: 'themes', tagSlugs: ['midnight'] },
  { slug: 'candy', label: 'Candy', description: 'Sweet, saturated pinks, purples, and blues', category: 'themes', tagSlugs: ['candy'] },
  { slug: 'tropical', label: 'Tropical', description: 'Vivid greens, corals, and teals from the tropics', category: 'themes', tagSlugs: ['tropical'] },
  { slug: 'nordic', label: 'Nordic', description: 'Muted, cool Scandinavian-inspired palettes', category: 'themes', tagSlugs: ['nordic'] },
  { slug: 'sunrise', label: 'Sunrise', description: 'Soft pinks, peaches, and golds of early morning', category: 'themes', tagSlugs: ['sunrise'] },
  { slug: 'jewel', label: 'Jewel', description: 'Rich, saturated gemstone-inspired tones', category: 'themes', tagSlugs: ['jewel'] },
  { slug: 'terracotta', label: 'Terracotta', description: 'Warm clay, rust, and adobe palettes', category: 'themes', tagSlugs: ['terracotta'] },
  { slug: 'lavender', label: 'Lavender', description: 'Soft purples, lilacs, and gentle violets', category: 'themes', tagSlugs: ['lavender'] },
  { slug: 'monochrome', label: 'Monochrome', description: 'Single-hue palettes with varied lightness', category: 'themes', tagSlugs: ['monochrome'] },
  { slug: 'gradient', label: 'Gradient', description: 'Smoothly transitioning color palettes', category: 'themes', tagSlugs: ['gradient'] },
  { slug: 'retro', label: 'Retro', description: '70s and 80s inspired warm, bold palettes', category: 'themes', tagSlugs: ['retro'] },
  { slug: 'minimalist', label: 'Minimalist', description: 'Clean, restrained palettes with few colors', category: 'themes', tagSlugs: ['minimalist'] },
  { slug: 'coffee', label: 'Coffee', description: 'Warm browns, creams, and roasted tones', category: 'themes', tagSlugs: ['coffee'] },
  { slug: 'aurora', label: 'Aurora', description: 'Northern lights greens, purples, and teals', category: 'themes', tagSlugs: ['aurora'] },
  { slug: 'space', label: 'Space', description: 'Deep cosmic palettes inspired by outer space', category: 'themes', tagSlugs: ['space'] },
  { slug: 'wedding', label: 'Wedding', description: 'Elegant, romantic palettes for celebrations', category: 'themes', tagSlugs: ['wedding'] },
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
