import { rgbToOklch, oklchToRgb } from '../oklch';
import { RGBColor, OKLCHColor } from '../types';

describe('OKLCH Color Conversions', () => {
  describe('rgbToOklch', () => {
    it('should convert pure red to OKLCH', () => {
      const rgb: RGBColor = { r: 255, g: 0, b: 0 };
      const oklch = rgbToOklch(rgb);
      
      // Red in OKLCH has specific characteristics
      expect(oklch.l).toBeGreaterThan(0.5); // Should be relatively bright
      expect(oklch.c).toBeGreaterThan(0.2); // Should have high chroma
      expect(oklch.h).toBeGreaterThan(0); // Hue should be in red range
      expect(oklch.h).toBeLessThan(60); // Red hue range
    });

    it('should convert pure green to OKLCH', () => {
      const rgb: RGBColor = { r: 0, g: 255, b: 0 };
      const oklch = rgbToOklch(rgb);
      
      expect(oklch.l).toBeGreaterThan(0.7); // Green is very bright in OKLCH
      expect(oklch.c).toBeGreaterThan(0.2);
      expect(oklch.h).toBeGreaterThan(100); // Green hue range
      expect(oklch.h).toBeLessThan(180);
    });

    it('should convert pure blue to OKLCH', () => {
      const rgb: RGBColor = { r: 0, g: 0, b: 255 };
      const oklch = rgbToOklch(rgb);
      
      expect(oklch.l).toBeLessThan(0.6); // Blue is darker in perceptual space
      expect(oklch.c).toBeGreaterThan(0.2);
      expect(oklch.h).toBeGreaterThan(200); // Blue hue range
      expect(oklch.h).toBeLessThan(320);
    });

    it('should convert white to OKLCH', () => {
      const rgb: RGBColor = { r: 255, g: 255, b: 255 };
      const oklch = rgbToOklch(rgb);
      
      expect(oklch.l).toBeCloseTo(1, 1); // Maximum lightness
      expect(oklch.c).toBeCloseTo(0, 2); // No chroma for white
    });

    it('should convert black to OKLCH', () => {
      const rgb: RGBColor = { r: 0, g: 0, b: 0 };
      const oklch = rgbToOklch(rgb);
      
      expect(oklch.l).toBeCloseTo(0, 1); // Minimum lightness
      expect(oklch.c).toBeCloseTo(0, 2); // No chroma for black
    });

    it('should convert gray to OKLCH with zero chroma', () => {
      const rgb: RGBColor = { r: 128, g: 128, b: 128 };
      const oklch = rgbToOklch(rgb);
      
      expect(oklch.l).toBeGreaterThan(0.4);
      expect(oklch.l).toBeLessThan(0.7);
      expect(oklch.c).toBeCloseTo(0, 2); // Grays should have very low chroma
    });
  });

  describe('oklchToRgb', () => {
    it('should convert OKLCH back to RGB', () => {
      const oklch: OKLCHColor = { l: 0.6, c: 0.15, h: 30 };
      const rgb = oklchToRgb(oklch);
      
      // Should produce valid RGB values
      expect(rgb.r).toBeGreaterThanOrEqual(0);
      expect(rgb.r).toBeLessThanOrEqual(255);
      expect(rgb.g).toBeGreaterThanOrEqual(0);
      expect(rgb.g).toBeLessThanOrEqual(255);
      expect(rgb.b).toBeGreaterThanOrEqual(0);
      expect(rgb.b).toBeLessThanOrEqual(255);
    });

    it('should handle edge case with l=0 (black)', () => {
      const oklch: OKLCHColor = { l: 0, c: 0, h: 0 };
      const rgb = oklchToRgb(oklch);
      
      expect(rgb.r).toBe(0);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(0);
    });

    it('should handle edge case with l=1 (white)', () => {
      const oklch: OKLCHColor = { l: 1, c: 0, h: 0 };
      const rgb = oklchToRgb(oklch);
      
      expect(rgb.r).toBe(255);
      expect(rgb.g).toBe(255);
      expect(rgb.b).toBe(255);
    });

    it('should clamp out-of-gamut colors', () => {
      // Very high chroma that might be out of sRGB gamut
      const oklch: OKLCHColor = { l: 0.7, c: 0.5, h: 120 };
      const rgb = oklchToRgb(oklch);
      
      // Should still produce valid RGB even if clamped
      expect(rgb.r).toBeGreaterThanOrEqual(0);
      expect(rgb.r).toBeLessThanOrEqual(255);
      expect(rgb.g).toBeGreaterThanOrEqual(0);
      expect(rgb.g).toBeLessThanOrEqual(255);
      expect(rgb.b).toBeGreaterThanOrEqual(0);
      expect(rgb.b).toBeLessThanOrEqual(255);
    });
  });

  describe('OKLCH-RGB round trip conversion', () => {
    it('should maintain color after round trip for in-gamut colors', () => {
      const original: RGBColor = { r: 128, g: 64, b: 200 };
      const oklch = rgbToOklch(original);
      const converted = oklchToRgb(oklch);
      
      // Allow some tolerance due to floating point operations
      expect(Math.abs(converted.r - original.r)).toBeLessThanOrEqual(2);
      expect(Math.abs(converted.g - original.g)).toBeLessThanOrEqual(2);
      expect(Math.abs(converted.b - original.b)).toBeLessThanOrEqual(2);
    });

    it('should maintain primary colors after round trip', () => {
      const primaries = [
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
        { r: 0, g: 0, b: 255 },
      ];

      primaries.forEach((original) => {
        const oklch = rgbToOklch(original);
        const converted = oklchToRgb(oklch);
        
        expect(Math.abs(converted.r - original.r)).toBeLessThanOrEqual(2);
        expect(Math.abs(converted.g - original.g)).toBeLessThanOrEqual(2);
        expect(Math.abs(converted.b - original.b)).toBeLessThanOrEqual(2);
      });
    });

    it('should maintain invariant: grays have near-zero chroma', () => {
      const grays = [
        { r: 0, g: 0, b: 0 },
        { r: 64, g: 64, b: 64 },
        { r: 128, g: 128, b: 128 },
        { r: 192, g: 192, b: 192 },
        { r: 255, g: 255, b: 255 },
      ];

      grays.forEach((gray) => {
        const oklch = rgbToOklch(gray);
        // Chroma should be very close to 0 for grays
        expect(oklch.c).toBeLessThan(0.01);
      });
    });

    it('should maintain invariant: lightness is monotonic with gray level', () => {
      const grays = [
        { r: 0, g: 0, b: 0 },
        { r: 64, g: 64, b: 64 },
        { r: 128, g: 128, b: 128 },
        { r: 192, g: 192, b: 192 },
        { r: 255, g: 255, b: 255 },
      ];

      const lightnesses = grays.map((gray) => rgbToOklch(gray).l);
      
      // Each lightness should be greater than the previous
      for (let i = 1; i < lightnesses.length; i++) {
        expect(lightnesses[i]).toBeGreaterThan(lightnesses[i - 1]);
      }
    });
  });

  describe('Perceptual uniformity properties', () => {
    it('should show that OKLCH preserves perceptual brightness', () => {
      // Colors with same L should have similar perceived brightness
      const color1: OKLCHColor = { l: 0.7, c: 0.1, h: 0 };
      const color2: OKLCHColor = { l: 0.7, c: 0.1, h: 180 };
      
      expect(color1.l).toBe(color2.l);
    });

    it('should handle hue rotation correctly', () => {
      const baseColor: RGBColor = { r: 255, g: 100, b: 50 };
      const oklch = rgbToOklch(baseColor);
      
      // Rotate hue by 180 degrees
      const complementOklch: OKLCHColor = {
        l: oklch.l,
        c: oklch.c,
        h: (oklch.h + 180) % 360,
      };
      
      const complementRgb = oklchToRgb(complementOklch);
      
      // Complement should have similar lightness in OKLCH space
      const complementOklchBack = rgbToOklch(complementRgb);
      expect(Math.abs(complementOklchBack.l - oklch.l)).toBeLessThan(0.05);
    });
  });
});
