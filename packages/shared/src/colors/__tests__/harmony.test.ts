import {
  generateAnalogous,
  generateComplementary,
  generateSplitComplementary,
  generateTriadic,
  generateNeutrals,
  removeDuplicates,
  hasSaneChroma,
  filterSaneChroma,
  applyQualityGates,
} from '../harmony';
import { OKLCHColor } from '../types';

describe('Color Harmony Strategies', () => {
  const baseColor: OKLCHColor = { l: 0.6, c: 0.15, h: 30 };

  describe('generateAnalogous', () => {
    it('should generate analogous colors with default angle', () => {
      const colors = generateAnalogous(baseColor);
      
      expect(colors).toHaveLength(2);
      expect(colors[0].l).toBe(baseColor.l);
      expect(colors[0].c).toBe(baseColor.c);
      expect(colors[0].h).toBeCloseTo(60, 0); // 30 + 30
      expect(colors[1].h).toBeCloseTo(0, 0); // 30 - 30
    });

    it('should generate specified count of analogous colors', () => {
      const colors = generateAnalogous(baseColor, 30, 4);
      
      expect(colors).toHaveLength(4);
    });

    it('should handle custom angle', () => {
      const colors = generateAnalogous(baseColor, 45, 1);
      
      expect(colors).toHaveLength(1);
      expect(colors[0].h).toBeCloseTo(75, 0); // 30 + 45
    });

    it('should normalize hue values correctly', () => {
      const highHue: OKLCHColor = { l: 0.6, c: 0.15, h: 350 };
      const colors = generateAnalogous(highHue, 30, 1);
      
      expect(colors[0].h).toBeCloseTo(20, 0); // 350 + 30 = 380 -> 20
    });
  });

  describe('generateComplementary', () => {
    it('should generate complementary color (180 degrees opposite)', () => {
      const complement = generateComplementary(baseColor);
      
      expect(complement.l).toBe(baseColor.l);
      expect(complement.c).toBe(baseColor.c);
      expect(complement.h).toBeCloseTo(210, 0); // 30 + 180
    });

    it('should handle hue wraparound', () => {
      const highHue: OKLCHColor = { l: 0.6, c: 0.15, h: 270 };
      const complement = generateComplementary(highHue);
      
      expect(complement.h).toBeCloseTo(90, 0); // 270 + 180 = 450 -> 90
    });
  });

  describe('generateSplitComplementary', () => {
    it('should generate two split-complementary colors', () => {
      const colors = generateSplitComplementary(baseColor);
      
      expect(colors).toHaveLength(2);
      expect(colors[0].l).toBe(baseColor.l);
      expect(colors[0].c).toBe(baseColor.c);
      expect(colors[0].h).toBeCloseTo(180, 0); // 210 - 30
      expect(colors[1].h).toBeCloseTo(240, 0); // 210 + 30
    });

    it('should handle custom angle', () => {
      const colors = generateSplitComplementary(baseColor, 45);
      
      expect(colors[0].h).toBeCloseTo(165, 0); // 210 - 45
      expect(colors[1].h).toBeCloseTo(255, 0); // 210 + 45
    });
  });

  describe('generateTriadic', () => {
    it('should generate two triadic colors (120 degrees apart)', () => {
      const colors = generateTriadic(baseColor);
      
      expect(colors).toHaveLength(2);
      expect(colors[0].l).toBe(baseColor.l);
      expect(colors[0].c).toBe(baseColor.c);
      expect(colors[0].h).toBeCloseTo(150, 0); // 30 + 120
      expect(colors[1].h).toBeCloseTo(270, 0); // 30 + 240
    });

    it('should maintain equal spacing', () => {
      const colors = generateTriadic(baseColor);
      
      const angle1 = colors[0].h - baseColor.h;
      const angle2 = colors[1].h - colors[0].h;
      const angle3 = (360 + baseColor.h - colors[1].h) % 360;
      
      expect(angle1).toBeCloseTo(120, 0);
      expect(angle2).toBeCloseTo(120, 0);
      expect(angle3).toBeCloseTo(120, 0);
    });
  });

  describe('generateNeutrals', () => {
    it('should generate neutral colors with low chroma', () => {
      const neutrals = generateNeutrals(baseColor);
      
      expect(neutrals).toHaveLength(3);
      
      neutrals.forEach((neutral) => {
        expect(neutral.c).toBeLessThan(0.05); // Very low chroma
        expect(neutral.h).toBe(baseColor.h); // Same hue
      });
    });

    it('should generate varying lightness levels', () => {
      const neutrals = generateNeutrals(baseColor, 5);
      
      expect(neutrals).toHaveLength(5);
      
      // Each neutral should have different lightness
      const lightnesses = neutrals.map((n) => n.l);
      const uniqueLightnesses = new Set(lightnesses);
      expect(uniqueLightnesses.size).toBe(5);
      
      // Lightnesses should be in order
      for (let i = 1; i < lightnesses.length; i++) {
        expect(lightnesses[i]).toBeGreaterThan(lightnesses[i - 1]);
      }
    });

    it('should reduce chroma significantly from base color', () => {
      const neutrals = generateNeutrals(baseColor);
      
      neutrals.forEach((neutral) => {
        expect(neutral.c).toBeLessThan(baseColor.c);
      });
    });
  });

  describe('Quality Gates', () => {
    describe('removeDuplicates', () => {
      it('should remove duplicate colors', () => {
        const colors: OKLCHColor[] = [
          { l: 0.5, c: 0.1, h: 30 },
          { l: 0.5, c: 0.1, h: 30 }, // Exact duplicate
          { l: 0.6, c: 0.15, h: 60 },
        ];
        
        const unique = removeDuplicates(colors);
        
        expect(unique).toHaveLength(2);
      });

      it('should remove near-duplicates within threshold', () => {
        const colors: OKLCHColor[] = [
          { l: 0.5, c: 0.1, h: 30 },
          { l: 0.500001, c: 0.100001, h: 30.0001 }, // Very close
          { l: 0.6, c: 0.15, h: 60 },
        ];
        
        const unique = removeDuplicates(colors);
        
        expect(unique).toHaveLength(2);
      });

      it('should keep colors outside threshold', () => {
        const colors: OKLCHColor[] = [
          { l: 0.5, c: 0.1, h: 30 },
          { l: 0.5, c: 0.1, h: 31 }, // 1 degree different
          { l: 0.6, c: 0.15, h: 60 },
        ];
        
        const unique = removeDuplicates(colors, 0.001);
        
        expect(unique).toHaveLength(3);
      });

      it('should handle hue wraparound in duplicate detection', () => {
        const colors: OKLCHColor[] = [
          { l: 0.5, c: 0.1, h: 1 },
          { l: 0.5, c: 0.1, h: 359 }, // Very close across 0 boundary
        ];
        
        const unique = removeDuplicates(colors, 0.01);
        
        expect(unique).toHaveLength(1);
      });
    });

    describe('hasSaneChroma', () => {
      it('should accept colors with normal chroma', () => {
        expect(hasSaneChroma({ l: 0.5, c: 0.2, h: 30 })).toBe(true);
        expect(hasSaneChroma({ l: 0.5, c: 0.0, h: 30 })).toBe(true);
        expect(hasSaneChroma({ l: 0.5, c: 0.4, h: 30 })).toBe(true);
      });

      it('should reject colors with excessive chroma', () => {
        expect(hasSaneChroma({ l: 0.5, c: 0.5, h: 30 })).toBe(false);
        expect(hasSaneChroma({ l: 0.5, c: 1.0, h: 30 })).toBe(false);
      });

      it('should reject colors with negative chroma', () => {
        expect(hasSaneChroma({ l: 0.5, c: -0.1, h: 30 })).toBe(false);
      });

      it('should respect custom maxChroma', () => {
        expect(hasSaneChroma({ l: 0.5, c: 0.3, h: 30 }, 0.2)).toBe(false);
        expect(hasSaneChroma({ l: 0.5, c: 0.15, h: 30 }, 0.2)).toBe(true);
      });
    });

    describe('filterSaneChroma', () => {
      it('should filter out colors with excessive chroma', () => {
        const colors: OKLCHColor[] = [
          { l: 0.5, c: 0.2, h: 30 },
          { l: 0.5, c: 0.5, h: 60 }, // Too high
          { l: 0.5, c: 0.3, h: 90 },
        ];
        
        const filtered = filterSaneChroma(colors);
        
        expect(filtered).toHaveLength(2);
        expect(filtered.every((c) => c.c <= 0.4)).toBe(true);
      });
    });

    describe('applyQualityGates', () => {
      it('should apply both duplicate removal and chroma filtering', () => {
        const colors: OKLCHColor[] = [
          { l: 0.5, c: 0.2, h: 30 },
          { l: 0.5, c: 0.2, h: 30 }, // Duplicate
          { l: 0.5, c: 0.5, h: 60 }, // Too high chroma
          { l: 0.5, c: 0.3, h: 90 },
        ];
        
        const processed = applyQualityGates(colors, { maxChroma: 0.4 });
        
        expect(processed).toHaveLength(2);
      });

      it('should allow skipping duplicate removal', () => {
        const colors: OKLCHColor[] = [
          { l: 0.5, c: 0.2, h: 30 },
          { l: 0.5, c: 0.2, h: 30 },
        ];
        
        const processed = applyQualityGates(colors, {
          removeDuplicates: false,
        });
        
        expect(processed).toHaveLength(2);
      });

      it('should use custom duplicate threshold', () => {
        const colors: OKLCHColor[] = [
          { l: 0.5, c: 0.1, h: 30 },
          { l: 0.5, c: 0.1, h: 31 },
        ];
        
        const strict = applyQualityGates(colors, { duplicateThreshold: 0.001 });
        expect(strict).toHaveLength(2);
        
        const loose = applyQualityGates(colors, { duplicateThreshold: 0.1 });
        expect(loose).toHaveLength(1);
      });
    });
  });

  describe('Integration tests', () => {
    it('should generate a full analogous palette with quality gates', () => {
      const palette = generateAnalogous(baseColor, 30, 4);
      const processed = applyQualityGates(palette, { maxChroma: 0.4 });
      
      expect(processed.length).toBeGreaterThan(0);
      expect(processed.every((c) => hasSaneChroma(c))).toBe(true);
    });

    it('should generate triadic palette with quality gates', () => {
      const palette = generateTriadic(baseColor);
      const processed = applyQualityGates(palette);
      
      expect(processed.length).toBe(2);
      expect(processed.every((c) => hasSaneChroma(c))).toBe(true);
    });
  });
});
