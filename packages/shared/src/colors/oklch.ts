import { RGBColor, OKLCHColor, OKLABColor, LinearRGBColor } from './types';

/**
 * Clamps a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Converts sRGB component to linear RGB
 */
function srgbToLinear(c: number): number {
  const abs = Math.abs(c);
  if (abs <= 0.04045) {
    return c / 12.92;
  }
  return (Math.sign(c) * Math.pow((abs + 0.055) / 1.055, 2.4));
}

/**
 * Converts linear RGB component to sRGB
 */
function linearToSrgb(c: number): number {
  const abs = Math.abs(c);
  if (abs <= 0.0031308) {
    return c * 12.92;
  }
  return Math.sign(c) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
}

/**
 * Converts RGB (0-255) to Linear RGB (0-1)
 */
function rgbToLinearRgb(rgb: RGBColor): LinearRGBColor {
  return {
    r: srgbToLinear(rgb.r / 255),
    g: srgbToLinear(rgb.g / 255),
    b: srgbToLinear(rgb.b / 255),
  };
}

/**
 * Converts Linear RGB (0-1) to RGB (0-255)
 */
function linearRgbToRgb(linear: LinearRGBColor): RGBColor {
  return {
    r: Math.round(clamp(linearToSrgb(linear.r), 0, 1) * 255),
    g: Math.round(clamp(linearToSrgb(linear.g), 0, 1) * 255),
    b: Math.round(clamp(linearToSrgb(linear.b), 0, 1) * 255),
  };
}

/**
 * Converts Linear RGB to OKLAB
 * Using the OKLab transformation matrix
 */
function linearRgbToOklab(linear: LinearRGBColor): OKLABColor {
  const l = 0.4122214708 * linear.r + 0.5363325363 * linear.g + 0.0514459929 * linear.b;
  const m = 0.2119034982 * linear.r + 0.6806995451 * linear.g + 0.1073969566 * linear.b;
  const s = 0.0883024619 * linear.r + 0.2817188376 * linear.g + 0.6299787005 * linear.b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

/**
 * Converts OKLAB to Linear RGB
 */
function oklabToLinearRgb(oklab: OKLABColor): LinearRGBColor {
  const l_ = oklab.l + 0.3963377774 * oklab.a + 0.2158037573 * oklab.b;
  const m_ = oklab.l - 0.1055613458 * oklab.a - 0.0638541728 * oklab.b;
  const s_ = oklab.l - 0.0894841775 * oklab.a - 1.291485548 * oklab.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

/**
 * Converts OKLAB to OKLCH
 */
function oklabToOklch(oklab: OKLABColor): OKLCHColor {
  const c = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b);
  let h = Math.atan2(oklab.b, oklab.a) * (180 / Math.PI);
  
  // Normalize hue to 0-360
  if (h < 0) {
    h += 360;
  }

  return {
    l: oklab.l,
    c: c,
    h: h,
  };
}

/**
 * Converts OKLCH to OKLAB
 */
function oklchToOklab(oklch: OKLCHColor): OKLABColor {
  const hRad = (oklch.h * Math.PI) / 180;
  
  return {
    l: oklch.l,
    a: oklch.c * Math.cos(hRad),
    b: oklch.c * Math.sin(hRad),
  };
}

/**
 * Converts RGB to OKLCH
 * @param rgb - RGB color with values 0-255
 * @returns OKLCH color
 */
export function rgbToOklch(rgb: RGBColor): OKLCHColor {
  const linear = rgbToLinearRgb(rgb);
  const oklab = linearRgbToOklab(linear);
  return oklabToOklch(oklab);
}

/**
 * Converts OKLCH to RGB
 * @param oklch - OKLCH color
 * @returns RGB color with values 0-255
 */
export function oklchToRgb(oklch: OKLCHColor): RGBColor {
  const oklab = oklchToOklab(oklch);
  const linear = oklabToLinearRgb(oklab);
  return linearRgbToRgb(linear);
}

/**
 * Converts OKLCH to HSL (via RGB)
 */
export function oklchToHsl(oklch: OKLCHColor) {
  const { rgbToHsl } = require('./hsl');
  const rgb = oklchToRgb(oklch);
  return rgbToHsl(rgb);
}

/**
 * Converts HSL to OKLCH (via RGB)
 */
export function hslToOklch(hsl: any) {
  const { hslToRgb } = require('./hsl');
  const rgb = hslToRgb(hsl);
  return rgbToOklch(rgb);
}
