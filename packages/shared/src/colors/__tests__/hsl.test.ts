import { hslToRgb, rgbToHsl } from '../hsl';
import { RGBColor, HSLColor } from '../types';

describe('HSL Color Conversions', () => {
  describe('hslToRgb', () => {
    it('should convert pure red', () => {
      const hsl: HSLColor = { h: 0, s: 100, l: 50 };
      const rgb = hslToRgb(hsl);
      expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should convert pure green', () => {
      const hsl: HSLColor = { h: 120, s: 100, l: 50 };
      const rgb = hslToRgb(hsl);
      expect(rgb).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('should convert pure blue', () => {
      const hsl: HSLColor = { h: 240, s: 100, l: 50 };
      const rgb = hslToRgb(hsl);
      expect(rgb).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should convert white', () => {
      const hsl: HSLColor = { h: 0, s: 0, l: 100 };
      const rgb = hslToRgb(hsl);
      expect(rgb).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should convert black', () => {
      const hsl: HSLColor = { h: 0, s: 0, l: 0 };
      const rgb = hslToRgb(hsl);
      expect(rgb).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should convert gray (50% lightness)', () => {
      const hsl: HSLColor = { h: 0, s: 0, l: 50 };
      const rgb = hslToRgb(hsl);
      expect(rgb).toEqual({ r: 128, g: 128, b: 128 });
    });

    it('should handle edge case h=360 same as h=0', () => {
      const hsl1: HSLColor = { h: 0, s: 100, l: 50 };
      const hsl2: HSLColor = { h: 360, s: 100, l: 50 };
      const rgb1 = hslToRgb(hsl1);
      const rgb2 = hslToRgb(hsl2);
      expect(rgb1).toEqual(rgb2);
    });
  });

  describe('rgbToHsl', () => {
    it('should convert pure red', () => {
      const rgb: RGBColor = { r: 255, g: 0, b: 0 };
      const hsl = rgbToHsl(rgb);
      expect(hsl.h).toBeCloseTo(0, 0);
      expect(hsl.s).toBeCloseTo(100, 0);
      expect(hsl.l).toBeCloseTo(50, 0);
    });

    it('should convert pure green', () => {
      const rgb: RGBColor = { r: 0, g: 255, b: 0 };
      const hsl = rgbToHsl(rgb);
      expect(hsl.h).toBeCloseTo(120, 0);
      expect(hsl.s).toBeCloseTo(100, 0);
      expect(hsl.l).toBeCloseTo(50, 0);
    });

    it('should convert pure blue', () => {
      const rgb: RGBColor = { r: 0, g: 0, b: 255 };
      const hsl = rgbToHsl(rgb);
      expect(hsl.h).toBeCloseTo(240, 0);
      expect(hsl.s).toBeCloseTo(100, 0);
      expect(hsl.l).toBeCloseTo(50, 0);
    });

    it('should convert white', () => {
      const rgb: RGBColor = { r: 255, g: 255, b: 255 };
      const hsl = rgbToHsl(rgb);
      expect(hsl.s).toBeCloseTo(0, 0);
      expect(hsl.l).toBeCloseTo(100, 0);
    });

    it('should convert black', () => {
      const rgb: RGBColor = { r: 0, g: 0, b: 0 };
      const hsl = rgbToHsl(rgb);
      expect(hsl.s).toBeCloseTo(0, 0);
      expect(hsl.l).toBeCloseTo(0, 0);
    });

    it('should convert gray', () => {
      const rgb: RGBColor = { r: 128, g: 128, b: 128 };
      const hsl = rgbToHsl(rgb);
      expect(hsl.s).toBeCloseTo(0, 0);
      expect(hsl.l).toBeCloseTo(50, 0);
    });
  });

  describe('HSL-RGB round trip conversion', () => {
    it('should maintain color after round trip (red)', () => {
      const original: RGBColor = { r: 255, g: 0, b: 0 };
      const hsl = rgbToHsl(original);
      const converted = hslToRgb(hsl);
      expect(converted).toEqual(original);
    });

    it('should maintain color after round trip (arbitrary color)', () => {
      const original: RGBColor = { r: 123, g: 234, b: 56 };
      const hsl = rgbToHsl(original);
      const converted = hslToRgb(hsl);
      // Allow small rounding differences
      expect(Math.abs(converted.r - original.r)).toBeLessThanOrEqual(2);
      expect(Math.abs(converted.g - original.g)).toBeLessThanOrEqual(2);
      expect(Math.abs(converted.b - original.b)).toBeLessThanOrEqual(2);
    });

    it('should maintain invariant: grayscale colors have s=0', () => {
      const grays = [
        { r: 0, g: 0, b: 0 },
        { r: 64, g: 64, b: 64 },
        { r: 128, g: 128, b: 128 },
        { r: 192, g: 192, b: 192 },
        { r: 255, g: 255, b: 255 },
      ];

      grays.forEach((gray) => {
        const hsl = rgbToHsl(gray);
        expect(hsl.s).toBeCloseTo(0, 0);
      });
    });
  });
});
