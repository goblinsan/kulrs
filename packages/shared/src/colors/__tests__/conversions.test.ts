import { oklchToHsl, hslToOklch } from '../conversions';
import { OKLCHColor, HSLColor } from '../types';

describe('Cross-format Color Conversions', () => {
  describe('oklchToHsl', () => {
    it('should convert OKLCH to HSL', () => {
      const oklch: OKLCHColor = { l: 0.6, c: 0.15, h: 30 };
      const hsl = oklchToHsl(oklch);
      
      expect(hsl.h).toBeGreaterThanOrEqual(0);
      expect(hsl.h).toBeLessThan(360);
      expect(hsl.s).toBeGreaterThanOrEqual(0);
      expect(hsl.s).toBeLessThanOrEqual(100);
      expect(hsl.l).toBeGreaterThanOrEqual(0);
      expect(hsl.l).toBeLessThanOrEqual(100);
    });

    it('should handle achromatic colors', () => {
      const gray: OKLCHColor = { l: 0.5, c: 0, h: 0 };
      const hsl = oklchToHsl(gray);
      
      expect(hsl.s).toBeCloseTo(0, 0);
    });
  });

  describe('hslToOklch', () => {
    it('should convert HSL to OKLCH', () => {
      const hsl: HSLColor = { h: 120, s: 50, l: 50 };
      const oklch = hslToOklch(hsl);
      
      expect(oklch.l).toBeGreaterThan(0);
      expect(oklch.l).toBeLessThan(1);
      expect(oklch.c).toBeGreaterThanOrEqual(0);
      expect(oklch.h).toBeGreaterThanOrEqual(0);
      expect(oklch.h).toBeLessThan(360);
    });

    it('should handle achromatic colors', () => {
      const gray: HSLColor = { h: 0, s: 0, l: 50 };
      const oklch = hslToOklch(gray);
      
      expect(oklch.c).toBeLessThan(0.01);
    });
  });

  describe('Round-trip conversions', () => {
    it('should maintain color through OKLCH->HSL->OKLCH', () => {
      const original: OKLCHColor = { l: 0.6, c: 0.15, h: 240 };
      const hsl = oklchToHsl(original);
      const converted = hslToOklch(hsl);
      
      expect(Math.abs(converted.l - original.l)).toBeLessThan(0.05);
      expect(Math.abs(converted.c - original.c)).toBeLessThan(0.05);
      // Hue might have slight variations due to rounding
      const hueDiff = Math.min(
        Math.abs(converted.h - original.h),
        360 - Math.abs(converted.h - original.h)
      );
      expect(hueDiff).toBeLessThan(10);
    });

    it('should maintain color through HSL->OKLCH->HSL', () => {
      const original: HSLColor = { h: 240, s: 50, l: 50 };
      const oklch = hslToOklch(original);
      const converted = oklchToHsl(oklch);
      
      expect(Math.abs(converted.s - original.s)).toBeLessThan(5);
      expect(Math.abs(converted.l - original.l)).toBeLessThan(5);
      const hueDiff = Math.min(
        Math.abs(converted.h - original.h),
        360 - Math.abs(converted.h - original.h)
      );
      expect(hueDiff).toBeLessThan(10);
    });
  });
});
