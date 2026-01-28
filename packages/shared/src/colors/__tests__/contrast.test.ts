import {
  ColorRole,
  WCAGLevel,
  calculateContrastRatio,
  meetsWCAGLevel,
  checkContrast,
  generateContrastReport,
  assignRoles,
  findAccessiblePairs,
  AssignedColor,
} from '../contrast';
import { OKLCHColor } from '../types';

describe('Contrast and Role Assignment', () => {
  describe('calculateContrastRatio', () => {
    it('should calculate contrast ratio between black and white', () => {
      const black: OKLCHColor = { l: 0, c: 0, h: 0 };
      const white: OKLCHColor = { l: 1, c: 0, h: 0 };
      
      const ratio = calculateContrastRatio(black, white);
      
      // Black and white should have maximum contrast (21:1)
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should be symmetric (order does not matter)', () => {
      const color1: OKLCHColor = { l: 0.3, c: 0.1, h: 30 };
      const color2: OKLCHColor = { l: 0.7, c: 0.15, h: 60 };
      
      const ratio1 = calculateContrastRatio(color1, color2);
      const ratio2 = calculateContrastRatio(color2, color1);
      
      expect(ratio1).toBeCloseTo(ratio2, 2);
    });

    it('should return 1 for identical colors', () => {
      const color: OKLCHColor = { l: 0.5, c: 0.1, h: 30 };
      
      const ratio = calculateContrastRatio(color, color);
      
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('should calculate ratio for medium contrast colors', () => {
      const dark: OKLCHColor = { l: 0.3, c: 0.1, h: 30 };
      const light: OKLCHColor = { l: 0.7, c: 0.1, h: 30 };
      
      const ratio = calculateContrastRatio(dark, light);
      
      // Should be somewhere between 1 and 21
      expect(ratio).toBeGreaterThan(1);
      expect(ratio).toBeLessThan(21);
    });

    it('should show different chroma does not affect contrast much if lightness is same', () => {
      const base: OKLCHColor = { l: 0.5, c: 0.1, h: 30 };
      const highChroma: OKLCHColor = { l: 0.5, c: 0.3, h: 30 };
      
      const ratio = calculateContrastRatio(base, highChroma);
      
      // Should be close to 1 since lightness is similar
      expect(ratio).toBeLessThan(2);
    });
  });

  describe('meetsWCAGLevel', () => {
    it('should correctly identify AA normal text compliance', () => {
      expect(meetsWCAGLevel(4.5, WCAGLevel.AA_NORMAL)).toBe(true);
      expect(meetsWCAGLevel(4.4, WCAGLevel.AA_NORMAL)).toBe(false);
      expect(meetsWCAGLevel(7.0, WCAGLevel.AA_NORMAL)).toBe(true);
    });

    it('should correctly identify AA large text compliance', () => {
      expect(meetsWCAGLevel(3.0, WCAGLevel.AA_LARGE)).toBe(true);
      expect(meetsWCAGLevel(2.9, WCAGLevel.AA_LARGE)).toBe(false);
    });

    it('should correctly identify AAA normal text compliance', () => {
      expect(meetsWCAGLevel(7.0, WCAGLevel.AAA_NORMAL)).toBe(true);
      expect(meetsWCAGLevel(6.9, WCAGLevel.AAA_NORMAL)).toBe(false);
    });

    it('should correctly identify AAA large text compliance', () => {
      expect(meetsWCAGLevel(4.5, WCAGLevel.AAA_LARGE)).toBe(true);
      expect(meetsWCAGLevel(4.4, WCAGLevel.AAA_LARGE)).toBe(false);
    });
  });

  describe('checkContrast', () => {
    it('should generate a complete contrast check', () => {
      const fg: AssignedColor = {
        role: ColorRole.TEXT,
        color: { l: 0.2, c: 0.05, h: 0 },
      };
      const bg: AssignedColor = {
        role: ColorRole.BACKGROUND,
        color: { l: 0.95, c: 0.02, h: 0 },
      };
      
      const check = checkContrast(fg, bg);
      
      expect(check.foreground).toBe(ColorRole.TEXT);
      expect(check.background).toBe(ColorRole.BACKGROUND);
      expect(check.ratio).toBeGreaterThan(10); // Should have good contrast
      expect(check.passes[WCAGLevel.AA_NORMAL]).toBe(true);
      expect(check.passes[WCAGLevel.AA_LARGE]).toBe(true);
      expect(check.passes[WCAGLevel.AAA_NORMAL]).toBe(true);
      expect(check.passes[WCAGLevel.AAA_LARGE]).toBe(true);
    });

    it('should fail WCAG checks for poor contrast', () => {
      const fg: AssignedColor = {
        role: ColorRole.TEXT,
        color: { l: 0.5, c: 0.1, h: 0 },
      };
      const bg: AssignedColor = {
        role: ColorRole.BACKGROUND,
        color: { l: 0.55, c: 0.1, h: 0 },
      };
      
      const check = checkContrast(fg, bg);
      
      expect(check.ratio).toBeLessThan(4.5);
      expect(check.passes[WCAGLevel.AA_NORMAL]).toBe(false);
      expect(check.passes[WCAGLevel.AAA_NORMAL]).toBe(false);
    });
  });

  describe('generateContrastReport', () => {
    it('should generate report for palette with background', () => {
      const palette: AssignedColor[] = [
        { role: ColorRole.BACKGROUND, color: { l: 0.95, c: 0.02, h: 0 } },
        { role: ColorRole.TEXT, color: { l: 0.2, c: 0.05, h: 0 } },
        { role: ColorRole.PRIMARY, color: { l: 0.5, c: 0.2, h: 240 } },
      ];
      
      const report = generateContrastReport(palette);
      
      // Should check text and primary against background (2 pairs)
      expect(report.checks.length).toBe(2);
      expect(report.summary.totalPairs).toBe(2);
      expect(report.summary.passingAA).toBeGreaterThan(0);
    });

    it('should generate report for palette without explicit background', () => {
      const palette: AssignedColor[] = [
        { role: ColorRole.PRIMARY, color: { l: 0.3, c: 0.2, h: 0 } },
        { role: ColorRole.SECONDARY, color: { l: 0.7, c: 0.2, h: 120 } },
        { role: ColorRole.ACCENT, color: { l: 0.5, c: 0.2, h: 240 } },
      ];
      
      const report = generateContrastReport(palette);
      
      // Should check all pairs (3 choose 2 = 3 pairs)
      expect(report.checks.length).toBe(3);
      expect(report.summary.totalPairs).toBe(3);
    });

    it('should calculate summary statistics correctly', () => {
      const palette: AssignedColor[] = [
        { role: ColorRole.BACKGROUND, color: { l: 0.95, c: 0.02, h: 0 } },
        { role: ColorRole.TEXT, color: { l: 0.2, c: 0.05, h: 0 } }, // Good contrast
        { role: ColorRole.PRIMARY, color: { l: 0.85, c: 0.1, h: 60 } }, // Poor contrast with bg
      ];
      
      const report = generateContrastReport(palette);
      
      expect(report.summary.totalPairs).toBe(2);
      // At least text should pass AA
      expect(report.summary.passingAA).toBeGreaterThanOrEqual(1);
      // AAA is stricter
      expect(report.summary.passingAAA).toBeLessThanOrEqual(report.summary.passingAA);
    });
  });

  describe('assignRoles', () => {
    it('should assign background to lightest color', () => {
      const colors: OKLCHColor[] = [
        { l: 0.3, c: 0.1, h: 0 },
        { l: 0.9, c: 0.05, h: 0 },
        { l: 0.5, c: 0.2, h: 120 },
      ];
      
      const assigned = assignRoles(colors);
      
      const background = assigned.find((a) => a.role === ColorRole.BACKGROUND);
      expect(background).toBeDefined();
      expect(background?.color.l).toBe(0.9);
    });

    it('should assign text to darkest color', () => {
      const colors: OKLCHColor[] = [
        { l: 0.2, c: 0.05, h: 0 },
        { l: 0.9, c: 0.05, h: 0 },
        { l: 0.5, c: 0.2, h: 120 },
      ];
      
      const assigned = assignRoles(colors);
      
      const text = assigned.find((a) => a.role === ColorRole.TEXT);
      expect(text).toBeDefined();
      expect(text?.color.l).toBe(0.2);
    });

    it('should assign primary to highest chroma mid-range color', () => {
      const colors: OKLCHColor[] = [
        { l: 0.2, c: 0.05, h: 0 },
        { l: 0.9, c: 0.05, h: 0 },
        { l: 0.5, c: 0.3, h: 120 }, // High chroma, mid lightness
        { l: 0.6, c: 0.15, h: 240 },
      ];
      
      const assigned = assignRoles(colors);
      
      const primary = assigned.find((a) => a.role === ColorRole.PRIMARY);
      expect(primary).toBeDefined();
      expect(primary?.color.c).toBe(0.3);
    });

    it('should handle empty array', () => {
      const assigned = assignRoles([]);
      
      expect(assigned).toHaveLength(0);
    });

    it('should handle single color', () => {
      const colors: OKLCHColor[] = [{ l: 0.5, c: 0.1, h: 30 }];
      
      const assigned = assignRoles(colors);
      
      expect(assigned).toHaveLength(1);
      expect(assigned[0].role).toBe(ColorRole.BACKGROUND);
    });

    it('should assign all colors', () => {
      const colors: OKLCHColor[] = [
        { l: 0.2, c: 0.05, h: 0 },
        { l: 0.9, c: 0.05, h: 0 },
        { l: 0.5, c: 0.3, h: 120 },
        { l: 0.6, c: 0.15, h: 240 },
        { l: 0.4, c: 0.2, h: 60 },
      ];
      
      const assigned = assignRoles(colors);
      
      // All colors should be assigned
      expect(assigned).toHaveLength(5);
      
      // Should have unique roles or at least all colors assigned
      const assignedColors = new Set(assigned.map((a) => a.color));
      expect(assignedColors.size).toBe(5);
    });

    it('should assign all provided colors to some role', () => {
      const colors: OKLCHColor[] = [
        { l: 0.2, c: 0.05, h: 0 },
        { l: 0.9, c: 0.05, h: 0 },
        { l: 0.5, c: 0.2, h: 10 }, // Red hue
        { l: 0.5, c: 0.2, h: 120 }, // Green hue
        { l: 0.5, c: 0.2, h: 200 }, // Blue hue
      ];
      
      const assigned = assignRoles(colors);
      
      expect(assigned).toHaveLength(5);
      // All colors should be assigned to some role
      const assignedColors = new Set(assigned.map((a) => a.color));
      expect(assignedColors.size).toBe(5);
      
      // Should have various role types
      const roles = assigned.map((a) => a.role);
      const uniqueRoles = new Set(roles);
      expect(uniqueRoles.size).toBeGreaterThan(2); // At least 3 different roles
    });
  });

  describe('findAccessiblePairs', () => {
    it('should find colors with sufficient contrast', () => {
      const target: OKLCHColor = { l: 0.2, c: 0.05, h: 0 };
      const palette: OKLCHColor[] = [
        { l: 0.25, c: 0.05, h: 0 }, // Too similar
        { l: 0.8, c: 0.05, h: 0 }, // Good contrast
        { l: 0.9, c: 0.05, h: 0 }, // Good contrast
      ];
      
      const accessible = findAccessiblePairs(target, palette, 4.5);
      
      expect(accessible.length).toBeGreaterThanOrEqual(2);
      accessible.forEach((color) => {
        const ratio = calculateContrastRatio(target, color);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    });

    it('should return empty array if no colors meet requirement', () => {
      const target: OKLCHColor = { l: 0.5, c: 0.1, h: 0 };
      const palette: OKLCHColor[] = [
        { l: 0.48, c: 0.1, h: 0 },
        { l: 0.52, c: 0.1, h: 0 },
        { l: 0.51, c: 0.1, h: 0 },
      ];
      
      const accessible = findAccessiblePairs(target, palette, 4.5);
      
      expect(accessible).toHaveLength(0);
    });

    it('should use custom minimum ratio', () => {
      const target: OKLCHColor = { l: 0.5, c: 0.1, h: 0 };
      const palette: OKLCHColor[] = [
        { l: 0.7, c: 0.1, h: 0 },
        { l: 0.9, c: 0.05, h: 0 },
      ];
      
      const strictPairs = findAccessiblePairs(target, palette, 7.0);
      const relaxedPairs = findAccessiblePairs(target, palette, 3.0);
      
      expect(relaxedPairs.length).toBeGreaterThanOrEqual(strictPairs.length);
    });
  });

  describe('Integration tests', () => {
    it('should create accessible palette with good contrast', () => {
      const colors: OKLCHColor[] = [
        { l: 0.95, c: 0.02, h: 0 }, // Light background
        { l: 0.2, c: 0.05, h: 0 }, // Dark text
        { l: 0.5, c: 0.2, h: 240 }, // Blue primary
      ];
      
      const assigned = assignRoles(colors);
      const report = generateContrastReport(assigned);
      
      // Background and text should have good contrast
      const bgTextCheck = report.checks.find(
        (c) => c.foreground === ColorRole.TEXT && c.background === ColorRole.BACKGROUND
      );
      
      expect(bgTextCheck).toBeDefined();
      expect(bgTextCheck?.passes[WCAGLevel.AA_NORMAL]).toBe(true);
    });
  });
});
