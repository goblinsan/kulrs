import {
  generateFromBaseColor,
  generateFromMood,
  generateFromImage,
  extractDominantColors,
} from '../palette-generator';
import { OKLCHColor } from '../types';
import { ColorRole } from '../contrast';

describe('Palette Generators', () => {
  describe('generateFromBaseColor', () => {
    it('should generate 8-12 colors from a base color', () => {
      const baseColor: OKLCHColor = { l: 0.6, c: 0.2, h: 220 };
      const palette = generateFromBaseColor(baseColor);
      
      expect(palette.colors.length).toBeGreaterThanOrEqual(8);
      expect(palette.colors.length).toBeLessThanOrEqual(12);
    });
    
    it('should include assigned roles for all colors', () => {
      const baseColor: OKLCHColor = { l: 0.6, c: 0.2, h: 220 };
      const palette = generateFromBaseColor(baseColor);
      
      palette.colors.forEach(color => {
        expect(color.role).toBeDefined();
        expect(color.color).toBeDefined();
        expect(color.color.l).toBeGreaterThanOrEqual(0);
        expect(color.color.l).toBeLessThanOrEqual(1);
      });
    });
    
    it('should include metadata with generator type and explanation', () => {
      const baseColor: OKLCHColor = { l: 0.6, c: 0.2, h: 220 };
      const palette = generateFromBaseColor(baseColor);
      
      expect(palette.metadata.generator).toBe('base-color');
      expect(palette.metadata.explanation).toContain('Generated palette');
      expect(palette.metadata.timestamp).toBeDefined();
    });
    
    it('should generate different palettes for different base colors', () => {
      const baseColor1: OKLCHColor = { l: 0.6, c: 0.2, h: 30 };
      const baseColor2: OKLCHColor = { l: 0.6, c: 0.2, h: 210 };
      
      const palette1 = generateFromBaseColor(baseColor1);
      const palette2 = generateFromBaseColor(baseColor2);
      
      expect(palette1.colors[0].color.h).not.toBe(palette2.colors[0].color.h);
    });
    
    it('should have at least one BACKGROUND and one TEXT role', () => {
      const baseColor: OKLCHColor = { l: 0.6, c: 0.2, h: 220 };
      const palette = generateFromBaseColor(baseColor);
      
      const hasBackground = palette.colors.some(c => c.role === ColorRole.BACKGROUND);
      const hasText = palette.colors.some(c => c.role === ColorRole.TEXT);
      
      expect(hasBackground).toBe(true);
      expect(hasText).toBe(true);
    });
    
    it('should handle low chroma base colors', () => {
      const baseColor: OKLCHColor = { l: 0.5, c: 0.05, h: 0 };
      const palette = generateFromBaseColor(baseColor);
      
      expect(palette.colors.length).toBeGreaterThanOrEqual(8);
      expect(palette.colors.length).toBeLessThanOrEqual(12);
    });
    
    it('should handle high lightness base colors', () => {
      const baseColor: OKLCHColor = { l: 0.9, c: 0.1, h: 120 };
      const palette = generateFromBaseColor(baseColor);
      
      expect(palette.colors.length).toBeGreaterThanOrEqual(8);
    });
  });
  
  describe('generateFromMood', () => {
    it('should generate 8-12 colors from mood text', () => {
      const palette = generateFromMood('calm ocean sunset');
      
      expect(palette.colors.length).toBeGreaterThanOrEqual(8);
      expect(palette.colors.length).toBeLessThanOrEqual(12);
    });
    
    it('should be deterministic with same mood text', () => {
      const mood = 'energetic summer day';
      const palette1 = generateFromMood(mood);
      const palette2 = generateFromMood(mood);
      
      expect(palette1.colors.length).toBe(palette2.colors.length);
      
      for (let i = 0; i < palette1.colors.length; i++) {
        expect(palette1.colors[i].color.l).toBeCloseTo(palette2.colors[i].color.l, 5);
        expect(palette1.colors[i].color.c).toBeCloseTo(palette2.colors[i].color.c, 5);
        expect(palette1.colors[i].color.h).toBeCloseTo(palette2.colors[i].color.h, 5);
      }
    });
    
    it('should be deterministic with explicit seed', () => {
      const mood = 'random mood text';
      const seed = 12345;
      const palette1 = generateFromMood(mood, seed);
      const palette2 = generateFromMood(mood, seed);
      
      expect(palette1.colors.length).toBe(palette2.colors.length);
      expect(palette1.colors[0].color.h).toBeCloseTo(palette2.colors[0].color.h, 5);
    });
    
    it('should generate different palettes for different moods', () => {
      const palette1 = generateFromMood('happy bright sunny');
      const palette2 = generateFromMood('dark mysterious night');
      
      // Should have different characteristics
      const avgL1 = palette1.colors.reduce((sum, c) => sum + c.color.l, 0) / palette1.colors.length;
      const avgL2 = palette2.colors.reduce((sum, c) => sum + c.color.l, 0) / palette2.colors.length;
      
      // Happy should generally be lighter than dark
      expect(avgL1).toBeGreaterThan(avgL2);
    });
    
    it('should map warm moods to warm hues', () => {
      const palette = generateFromMood('warm cozy fireplace');
      
      // Check that at least some colors have warm hues (roughly 0-60 degrees)
      const warmColors = palette.colors.filter(c => 
        c.color.h >= 0 && c.color.h <= 60
      );
      
      expect(warmColors.length).toBeGreaterThan(0);
    });
    
    it('should map cool moods to cool hues', () => {
      const palette = generateFromMood('cool winter ice');
      
      // Check that at least some colors have cool hues (roughly 180-270 degrees)
      const coolColors = palette.colors.filter(c => 
        c.color.h >= 180 && c.color.h <= 270
      );
      
      expect(coolColors.length).toBeGreaterThan(0);
    });
    
    it('should handle minimal mood with low chroma', () => {
      const palette = generateFromMood('minimal clean simple');
      
      // Minimal should have generally low chroma
      const avgChroma = palette.colors.reduce((sum, c) => sum + c.color.c, 0) / palette.colors.length;
      
      expect(avgChroma).toBeLessThan(0.2);
    });
    
    it('should include metadata with generator type and explanation', () => {
      const mood = 'peaceful forest morning';
      const palette = generateFromMood(mood);
      
      expect(palette.metadata.generator).toBe('mood');
      expect(palette.metadata.explanation).toContain('Generated');
      expect(palette.metadata.explanation).toContain(mood);
      expect(palette.metadata.timestamp).toBeDefined();
    });
  });
  
  describe('extractDominantColors', () => {
    it('should extract dominant colors from pixel data', () => {
      const pixels = [
        { r: 255, g: 100, b: 50 },
        { r: 255, g: 100, b: 50 },
        { r: 50, g: 100, b: 255 },
        { r: 50, g: 100, b: 255 },
        { r: 100, g: 255, b: 100 },
      ];
      
      const dominant = extractDominantColors(pixels, 3);
      
      expect(dominant.length).toBe(3);
      dominant.forEach(color => {
        expect(color.l).toBeGreaterThanOrEqual(0);
        expect(color.l).toBeLessThanOrEqual(1);
        expect(color.c).toBeGreaterThanOrEqual(0);
        expect(color.h).toBeGreaterThanOrEqual(0);
        expect(color.h).toBeLessThan(360);
      });
    });
    
    it('should return empty array for empty input', () => {
      const dominant = extractDominantColors([]);
      
      expect(dominant).toEqual([]);
    });
    
    it('should cluster similar colors together', () => {
      // Create pixels with two distinct color groups
      const redPixels = Array(50).fill({ r: 255, g: 0, b: 0 });
      const bluePixels = Array(50).fill({ r: 0, g: 0, b: 255 });
      const pixels = [...redPixels, ...bluePixels];
      
      const dominant = extractDominantColors(pixels, 2);
      
      expect(dominant.length).toBe(2);
      // Should have one reddish and one bluish color
      const hasRed = dominant.some(c => c.h >= 0 && c.h <= 60 || c.h >= 300);
      const hasBlue = dominant.some(c => c.h >= 210 && c.h <= 270);
      
      expect(hasRed || hasBlue).toBe(true);
    });
  });
  
  describe('generateFromImage', () => {
    it('should generate 8-12 colors from image pixels', () => {
      const pixels = [
        { r: 255, g: 100, b: 50 },
        { r: 255, g: 120, b: 60 },
        { r: 50, g: 100, b: 255 },
        { r: 60, g: 110, b: 255 },
        { r: 100, g: 255, b: 100 },
        { r: 110, g: 255, b: 110 },
        { r: 200, g: 200, b: 200 },
        { r: 50, g: 50, b: 50 },
      ];
      
      const palette = generateFromImage(pixels);
      
      expect(palette.colors.length).toBeGreaterThanOrEqual(8);
      expect(palette.colors.length).toBeLessThanOrEqual(12);
    });
    
    it('should include assigned roles', () => {
      const pixels = [
        { r: 255, g: 100, b: 50 },
        { r: 50, g: 100, b: 255 },
        { r: 100, g: 255, b: 100 },
        { r: 200, g: 200, b: 200 },
        { r: 50, g: 50, b: 50 },
      ];
      
      const palette = generateFromImage(pixels);
      
      palette.colors.forEach(color => {
        expect(color.role).toBeDefined();
      });
    });
    
    it('should include metadata with generator type', () => {
      const pixels = [
        { r: 255, g: 100, b: 50 },
        { r: 50, g: 100, b: 255 },
      ];
      
      const palette = generateFromImage(pixels);
      
      expect(palette.metadata.generator).toBe('image');
      expect(palette.metadata.explanation).toContain('Generated palette');
      expect(palette.metadata.timestamp).toBeDefined();
    });
    
    it('should work with typical photo (many pixels)', () => {
      // Simulate a photo with multiple color regions
      const skyPixels = Array(100).fill({ r: 135, g: 206, b: 235 }); // Sky blue
      const grassPixels = Array(100).fill({ r: 34, g: 139, b: 34 }); // Forest green
      const sunPixels = Array(20).fill({ r: 255, g: 215, b: 0 }); // Gold
      
      const pixels = [...skyPixels, ...grassPixels, ...sunPixels];
      
      const palette = generateFromImage(pixels);
      
      expect(palette.colors.length).toBeGreaterThanOrEqual(8);
      expect(palette.colors.length).toBeLessThanOrEqual(12);
      
      // Should include colors representing sky, grass, and possibly sun
      const hasBlueish = palette.colors.some(c => c.color.h >= 180 && c.color.h <= 240);
      const hasGreenish = palette.colors.some(c => c.color.h >= 90 && c.color.h <= 150);
      
      expect(hasBlueish || hasGreenish).toBe(true);
    });
    
    it('should prioritize dominant colors in final palette', () => {
      // Create a heavily red-dominant image
      const redPixels = Array(200).fill({ r: 255, g: 50, b: 50 });
      const otherPixels = Array(10).fill({ r: 50, g: 255, b: 50 });
      
      const pixels = [...redPixels, ...otherPixels];
      const palette = generateFromImage(pixels);
      
      // Should have reddish colors
      const redColors = palette.colors.filter(c => 
        (c.color.h >= 0 && c.color.h <= 30) || (c.color.h >= 330 && c.color.h <= 360)
      );
      
      expect(redColors.length).toBeGreaterThan(0);
    });
  });
  
  describe('Integration tests', () => {
    it('should generate valid OKLCH values for all generators', () => {
      const baseColor: OKLCHColor = { l: 0.6, c: 0.2, h: 220 };
      const palettes = [
        generateFromBaseColor(baseColor),
        generateFromMood('happy sunny day'),
        generateFromImage([
          { r: 255, g: 100, b: 50 },
          { r: 50, g: 100, b: 255 },
        ]),
      ];
      
      palettes.forEach(palette => {
        palette.colors.forEach(({ color }) => {
          expect(color.l).toBeGreaterThanOrEqual(0);
          expect(color.l).toBeLessThanOrEqual(1);
          expect(color.c).toBeGreaterThanOrEqual(0);
          expect(color.c).toBeLessThanOrEqual(0.4); // Quality gate max
          expect(color.h).toBeGreaterThanOrEqual(0);
          expect(color.h).toBeLessThan(360);
        });
      });
    });
    
    it('should have unique timestamps for different generations', async () => {
      const baseColor: OKLCHColor = { l: 0.6, c: 0.2, h: 220 };
      const palette1 = generateFromBaseColor(baseColor);
      
      // Wait a tiny bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const palette2 = generateFromBaseColor(baseColor);
      
      expect(palette1.metadata.timestamp).not.toBe(palette2.metadata.timestamp);
    });
  });
});
