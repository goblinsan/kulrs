/**
 * RGB color representation (0-255 for each channel)
 */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * HSL color representation
 * h: hue in degrees (0-360)
 * s: saturation as percentage (0-100)
 * l: lightness as percentage (0-100)
 */
export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

/**
 * OKLCH color representation (perceptually uniform color space)
 * l: lightness (0-1)
 * c: chroma (0-0.4 typically)
 * h: hue in degrees (0-360)
 */
export interface OKLCHColor {
  l: number;
  c: number;
  h: number;
}

/**
 * OKLAB color representation (intermediate for OKLCH conversions)
 * l: lightness (0-1)
 * a: green-red axis
 * b: blue-yellow axis
 */
export interface OKLABColor {
  l: number;
  a: number;
  b: number;
}

/**
 * Linear RGB color (intermediate for OKLCH conversions)
 */
export interface LinearRGBColor {
  r: number;
  g: number;
  b: number;
}
