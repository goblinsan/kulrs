import { THEMES, listThemes, getThemeBySlug } from '../themes';

describe('themes', () => {
  describe('THEMES constant', () => {
    it('exports a non-empty array of themes', () => {
      expect(Array.isArray(THEMES)).toBe(true);
      expect(THEMES.length).toBeGreaterThan(0);
    });

    it('every theme has a slug, label, description, and tagSlugs', () => {
      for (const theme of THEMES) {
        expect(typeof theme.slug).toBe('string');
        expect(theme.slug.length).toBeGreaterThan(0);
        expect(typeof theme.label).toBe('string');
        expect(theme.label.length).toBeGreaterThan(0);
        expect(typeof theme.description).toBe('string');
        expect(theme.description.length).toBeGreaterThan(0);
        expect(Array.isArray(theme.tagSlugs)).toBe(true);
        expect(theme.tagSlugs.length).toBeGreaterThan(0);
      }
    });

    it('every theme has a unique slug', () => {
      const slugs = THEMES.map((t) => t.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });
  });

  describe('listThemes()', () => {
    it('returns the full themes array', () => {
      const themes = listThemes();
      expect(themes).toHaveLength(THEMES.length);
      expect(themes[0].slug).toBe(THEMES[0].slug);
    });
  });

  describe('getThemeBySlug()', () => {
    it('returns a theme for a known slug', () => {
      const theme = getThemeBySlug('warm');
      expect(theme).toBeDefined();
      expect(theme?.slug).toBe('warm');
      expect(theme?.tagSlugs).toContain('warm');
    });

    it('returns undefined for an unknown slug', () => {
      expect(getThemeBySlug('nonexistent-theme-xyz')).toBeUndefined();
    });

    it('returns the correct theme for every defined slug', () => {
      for (const expected of THEMES) {
        const found = getThemeBySlug(expected.slug);
        expect(found).toBeDefined();
        expect(found?.slug).toBe(expected.slug);
      }
    });
  });
});
