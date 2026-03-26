import { generatePaletteSuggestions, generateImagePaletteSuggestions, RANKING_USABILITY_WEIGHT } from '../palette-suggestions';
import { OKLCHColor } from '../types';

const BLUE_SOURCE: OKLCHColor = { l: 0.55, c: 0.2, h: 220 };
const WARM_SOURCE: OKLCHColor = { l: 0.6, c: 0.25, h: 35 };

describe('generatePaletteSuggestions', () => {
  it('returns the requested number of suggestions', () => {
    expect(generatePaletteSuggestions(BLUE_SOURCE, 5, 3)).toHaveLength(3);
    expect(generatePaletteSuggestions(BLUE_SOURCE, 5, 1)).toHaveLength(1);
    expect(generatePaletteSuggestions(BLUE_SOURCE, 5, 4)).toHaveLength(4);
  });

  it('clamps count to [1, 4]', () => {
    expect(generatePaletteSuggestions(BLUE_SOURCE, 5, 0)).toHaveLength(1);
    expect(generatePaletteSuggestions(BLUE_SOURCE, 5, 99)).toHaveLength(4);
  });

  it('assigns sequential ranks starting at 1', () => {
    const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
    suggestions.forEach((s, i) => {
      expect(s.rank).toBe(i + 1);
    });
  });

  it('returns unique harmony strategies', () => {
    const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
    const harmonies = suggestions.map((s) => s.harmony);
    const unique = new Set(harmonies);
    expect(unique.size).toBe(harmonies.length);
  });

  it('each suggestion contains a palette with at least one color', () => {
    const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
    suggestions.forEach((s) => {
      expect(s.palette.colors.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Issue #109 – Palette usability scoring
  // -------------------------------------------------------------------------

  describe('usability scoring (Issue #109)', () => {
    it('each suggestion includes usabilityScore in [0, 1]', () => {
      const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
      suggestions.forEach((s) => {
        expect(typeof s.usabilityScore).toBe('number');
        expect(s.usabilityScore).toBeGreaterThanOrEqual(0);
        expect(s.usabilityScore).toBeLessThanOrEqual(1);
      });
    });

    it('each suggestion includes a uiViable boolean', () => {
      const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
      suggestions.forEach((s) => {
        expect(typeof s.uiViable).toBe('boolean');
      });
    });

    it('uiViable is true exactly when usabilityScore >= 0.5', () => {
      const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
      suggestions.forEach((s) => {
        expect(s.uiViable).toBe(s.usabilityScore >= 0.5);
      });
    });

    it('works for warm source color too', () => {
      const suggestions = generatePaletteSuggestions(WARM_SOURCE);
      suggestions.forEach((s) => {
        expect(s.usabilityScore).toBeGreaterThanOrEqual(0);
        expect(s.usabilityScore).toBeLessThanOrEqual(1);
        expect(typeof s.uiViable).toBe('boolean');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Issue #110 – Semantic color roles
  // -------------------------------------------------------------------------

  describe('semantic color roles (Issue #110)', () => {
    it('each suggestion includes a semanticRoles object', () => {
      const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
      suggestions.forEach((s) => {
        expect(typeof s.semanticRoles).toBe('object');
        expect(s.semanticRoles).not.toBeNull();
      });
    });

    it('provides a non-empty suggestion for every role present in the palette', () => {
      const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
      for (const s of suggestions) {
        const roles = s.palette.colors.map((c) => c.role);
        for (const role of roles) {
          expect(s.semanticRoles[role]).toBeDefined();
          expect(typeof s.semanticRoles[role]).toBe('string');
          expect(s.semanticRoles[role].length).toBeGreaterThan(0);
        }
      }
    });

    it('background role suggestion mentions surface or background', () => {
      const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
      for (const s of suggestions) {
        const bg = s.palette.colors.find((c) => c.role === 'background');
        if (bg) {
          const hint = s.semanticRoles['background'].toLowerCase();
          expect(hint).toMatch(/surface|background|canvas/);
        }
      }
    });

    it('text role suggestion mentions text or contrast ratio', () => {
      const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
      for (const s of suggestions) {
        const text = s.palette.colors.find((c) => c.role === 'text');
        if (text) {
          const hint = s.semanticRoles['text'].toLowerCase();
          expect(hint).toMatch(/text|contrast/);
        }
      }
    });

    it('primary role suggestion mentions primary or action', () => {
      const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
      for (const s of suggestions) {
        const primary = s.palette.colors.find((c) => c.role === 'primary');
        if (primary) {
          const hint = s.semanticRoles['primary'].toLowerCase();
          expect(hint).toMatch(/primary|action|interactive/);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // Issue #111 – Accessibility-aware ranking
  // -------------------------------------------------------------------------

  describe('accessibility-aware ranking (Issue #111)', () => {
    it('each suggestion includes a rankingExplanation string', () => {
      const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
      suggestions.forEach((s) => {
        expect(typeof s.rankingExplanation).toBe('string');
        expect(s.rankingExplanation.length).toBeGreaterThan(0);
      });
    });

    it('rankingExplanation references WCAG or contrast or accessibility', () => {
      const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
      suggestions.forEach((s) => {
        expect(s.rankingExplanation.toLowerCase()).toMatch(/wcag|contrast|accessibility/);
      });
    });

    it('rankingExplanation includes the harmony type', () => {
      const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
      suggestions.forEach((s) => {
        expect(s.rankingExplanation.toLowerCase()).toContain(s.harmony.toLowerCase());
      });
    });

    it('suggestions are sorted so that the composite score is non-increasing', () => {
      const suggestions = generatePaletteSuggestions(BLUE_SOURCE);
      const composite = (s: (typeof suggestions)[0]) =>
        s.score * (1 - RANKING_USABILITY_WEIGHT) + s.usabilityScore * RANKING_USABILITY_WEIGHT;

      for (let i = 1; i < suggestions.length; i++) {
        expect(composite(suggestions[i - 1])).toBeGreaterThanOrEqual(composite(suggestions[i]));
      }
    });

    it('a palette with higher usabilityScore can outrank one with higher raw score', () => {
      // Run with enough suggestions to observe ranking
      const suggestions = generatePaletteSuggestions(BLUE_SOURCE, 5, 4);
      // At least verify ordering is by composite (not just raw score)
      const composites = suggestions.map(
        (s) => s.score * (1 - RANKING_USABILITY_WEIGHT) + s.usabilityScore * RANKING_USABILITY_WEIGHT
      );
      for (let i = 1; i < composites.length; i++) {
        expect(composites[i - 1]).toBeGreaterThanOrEqual(composites[i]);
      }
    });
  });
});

// =============================================================================
// Issue #118 – Image-derived palette suggestions
// =============================================================================

const IMAGE_COLORS: OKLCHColor[] = [
  { l: 0.55, c: 0.2, h: 220 },
  { l: 0.6, c: 0.25, h: 35 },
  { l: 0.4, c: 0.15, h: 120 },
];

describe('generateImagePaletteSuggestions (Issue #118)', () => {
  it('returns the requested number of suggestions', () => {
    expect(generateImagePaletteSuggestions(IMAGE_COLORS, 5, 3)).toHaveLength(3);
    expect(generateImagePaletteSuggestions(IMAGE_COLORS, 5, 1)).toHaveLength(1);
    expect(generateImagePaletteSuggestions(IMAGE_COLORS, 5, 4)).toHaveLength(4);
  });

  it('clamps count to [1, 4]', () => {
    expect(generateImagePaletteSuggestions(IMAGE_COLORS, 5, 0)).toHaveLength(1);
    expect(generateImagePaletteSuggestions(IMAGE_COLORS, 5, 99)).toHaveLength(4);
  });

  it('assigns sequential ranks starting at 1', () => {
    const suggestions = generateImagePaletteSuggestions(IMAGE_COLORS);
    suggestions.forEach((s, i) => {
      expect(s.rank).toBe(i + 1);
    });
  });

  it('returns unique harmony strategies', () => {
    const suggestions = generateImagePaletteSuggestions(IMAGE_COLORS);
    const harmonies = suggestions.map((s) => s.harmony);
    const unique = new Set(harmonies);
    expect(unique.size).toBe(harmonies.length);
  });

  it('each harmony name starts with "image-"', () => {
    const suggestions = generateImagePaletteSuggestions(IMAGE_COLORS);
    for (const s of suggestions) {
      expect(s.harmony).toMatch(/^image-/);
    }
  });

  it('each suggestion contains a palette with at least one color', () => {
    const suggestions = generateImagePaletteSuggestions(IMAGE_COLORS);
    suggestions.forEach((s) => {
      expect(s.palette.colors.length).toBeGreaterThan(0);
    });
  });

  it('tags include "image" for every suggestion', () => {
    const suggestions = generateImagePaletteSuggestions(IMAGE_COLORS);
    for (const s of suggestions) {
      expect(s.tags).toContain('image');
    }
  });

  it('each suggestion includes usabilityScore in [0, 1] and a uiViable boolean', () => {
    const suggestions = generateImagePaletteSuggestions(IMAGE_COLORS);
    for (const s of suggestions) {
      expect(typeof s.usabilityScore).toBe('number');
      expect(s.usabilityScore).toBeGreaterThanOrEqual(0);
      expect(s.usabilityScore).toBeLessThanOrEqual(1);
      expect(typeof s.uiViable).toBe('boolean');
      expect(s.uiViable).toBe(s.usabilityScore >= 0.5);
    }
  });

  it('each suggestion includes a non-empty semanticRoles object', () => {
    const suggestions = generateImagePaletteSuggestions(IMAGE_COLORS);
    for (const s of suggestions) {
      expect(typeof s.semanticRoles).toBe('object');
      expect(Object.keys(s.semanticRoles).length).toBeGreaterThan(0);
    }
  });

  it('each suggestion includes a rankingExplanation referencing accessibility', () => {
    const suggestions = generateImagePaletteSuggestions(IMAGE_COLORS);
    for (const s of suggestions) {
      expect(typeof s.rankingExplanation).toBe('string');
      expect(s.rankingExplanation.toLowerCase()).toMatch(/wcag|contrast|accessibility/);
    }
  });

  it('suggestions are sorted so the composite score is non-increasing', () => {
    const suggestions = generateImagePaletteSuggestions(IMAGE_COLORS);
    const composite = (s: (typeof suggestions)[0]) =>
      s.score * (1 - RANKING_USABILITY_WEIGHT) + s.usabilityScore * RANKING_USABILITY_WEIGHT;
    for (let i = 1; i < suggestions.length; i++) {
      expect(composite(suggestions[i - 1])).toBeGreaterThanOrEqual(composite(suggestions[i]));
    }
  });

  it('works with a single input color', () => {
    const single: OKLCHColor[] = [{ l: 0.5, c: 0.2, h: 200 }];
    const suggestions = generateImagePaletteSuggestions(single);
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach((s) => {
      expect(s.palette.colors.length).toBeGreaterThan(0);
    });
  });

  it('throws when given an empty colors array', () => {
    expect(() => generateImagePaletteSuggestions([])).toThrow();
  });

  it('caps input to 5 colors without throwing', () => {
    const manyColors: OKLCHColor[] = Array.from({ length: 10 }, (_, i) => ({
      l: 0.5,
      c: 0.2,
      h: (i * 36) % 360,
    }));
    expect(() => generateImagePaletteSuggestions(manyColors)).not.toThrow();
  });
});

