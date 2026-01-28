# Color Engine Library

A comprehensive color manipulation library for the Kulrs application, providing perceptually uniform color spaces, harmony generation, and accessibility checking.

## Features

### Color Spaces

- **OKLCH**: Perceptually uniform color space (lightness, chroma, hue)
- **HSL**: Traditional hue, saturation, lightness
- **RGB**: Standard RGB color representation

### Color Conversions

All conversions are bidirectional and maintain color accuracy:
- OKLCH ↔ RGB
- HSL ↔ RGB
- OKLCH ↔ HSL (via RGB)

### Harmony Strategies

Generate harmonious color palettes:
- **Analogous**: Adjacent colors on the color wheel
- **Complementary**: Opposite colors (180°)
- **Split-Complementary**: Two colors adjacent to complement
- **Triadic**: Three evenly spaced colors (120° apart)
- **Neutrals**: Low-chroma variations

### Quality Gates

Ensure color palette quality:
- Duplicate removal with configurable threshold
- Chroma validation (prevent oversaturated colors)
- Batch quality gate application

### Accessibility

WCAG 2.0 compliant contrast checking:
- Contrast ratio calculation
- AA/AAA compliance checking (normal and large text)
- Automatic role assignment (background, text, primary, etc.)
- Comprehensive contrast reports
- Find accessible color pairs

## Usage Examples

### Basic Color Conversion

```typescript
import { rgbToOklch, oklchToRgb, hslToRgb } from '@kulrs/shared';

// Convert RGB to OKLCH
const oklch = rgbToOklch({ r: 255, g: 100, b: 50 });
console.log(oklch); // { l: 0.68, c: 0.21, h: 45 }

// Convert OKLCH back to RGB
const rgb = oklchToRgb(oklch);

// Convert HSL to RGB
const rgbFromHsl = hslToRgb({ h: 240, s: 100, l: 50 });
```

### Generate Color Harmonies

```typescript
import { 
  generateAnalogous, 
  generateComplementary,
  generateTriadic 
} from '@kulrs/shared';

const baseColor = { l: 0.6, c: 0.15, h: 240 };

// Generate analogous colors
const analogous = generateAnalogous(baseColor, 30, 2);

// Generate complement
const complement = generateComplementary(baseColor);

// Generate triadic palette
const triadic = generateTriadic(baseColor);
```

### Apply Quality Gates

```typescript
import { applyQualityGates } from '@kulrs/shared';

const colors = [
  { l: 0.5, c: 0.2, h: 30 },
  { l: 0.5, c: 0.2, h: 30 }, // Duplicate
  { l: 0.5, c: 0.8, h: 60 }, // Too high chroma
];

const filtered = applyQualityGates(colors, {
  maxChroma: 0.4,
  removeDuplicates: true,
});
```

### Check Accessibility

```typescript
import { 
  assignRoles, 
  generateContrastReport,
  calculateContrastRatio 
} from '@kulrs/shared';

const colors = [
  { l: 0.95, c: 0.02, h: 0 }, // Light
  { l: 0.2, c: 0.05, h: 0 },  // Dark
  { l: 0.5, c: 0.2, h: 240 }, // Blue
];

// Assign roles automatically
const palette = assignRoles(colors);

// Generate accessibility report
const report = generateContrastReport(palette);
console.log(`${report.summary.passingAA}/${report.summary.totalPairs} pairs pass WCAG AA`);

// Check specific contrast
const ratio = calculateContrastRatio(colors[0], colors[1]);
console.log(`Contrast ratio: ${ratio.toFixed(2)}:1`);
```

## Color Roles

The library automatically assigns semantic roles:
- `BACKGROUND`: Lightest color
- `TEXT`: Darkest color
- `PRIMARY`: Highest chroma mid-range color
- `SECONDARY`: Next highest chroma
- `ACCENT`: Additional accent color
- `ERROR`: Red hues (0-60°)
- `SUCCESS`: Green hues (60-150°)
- `INFO`: Blue hues (150-270°)
- `WARNING`: Purple-red hues (270-360°)

## WCAG Levels

Supported compliance levels:
- `AA_NORMAL`: 4.5:1 (normal text)
- `AA_LARGE`: 3.0:1 (large text, 18pt+ or 14pt+ bold)
- `AAA_NORMAL`: 7.0:1 (enhanced normal text)
- `AAA_LARGE`: 4.5:1 (enhanced large text)

## Testing

The library includes comprehensive test coverage (90+ tests):
- Edge case handling
- Color space invariants
- Round-trip conversion accuracy
- Harmony strategy correctness
- Accessibility compliance

Run tests:
```bash
npm test
```

## TypeScript Support

Full TypeScript support with exported types:
- `RGBColor`
- `HSLColor`
- `OKLCHColor`
- `OKLABColor`
- `LinearRGBColor`
- `ColorRole`
- `WCAGLevel`
- `AssignedColor`
- `ContrastCheck`
- `ContrastReport`
