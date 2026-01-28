import { z } from 'zod';

export const createPaletteSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().default(true),
  sourceId: z.string().uuid().optional(),
  colors: z
    .array(
      z.object({
        hexValue: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        position: z.number().int().min(0),
        name: z.string().max(100).optional(),
      })
    )
    .min(1)
    .max(10),
  tagIds: z.array(z.string().uuid()).optional(),
});

export type CreatePaletteInput = z.infer<typeof createPaletteSchema>;

// Palette generator schemas
export const generateFromBaseColorSchema = z.object({
  color: z.object({
    l: z.number().min(0).max(1),
    c: z.number().min(0).max(0.4),
    h: z.number().min(0).max(360, { message: 'Hue must be in range [0, 360)' }),
  }),
});

export const generateFromMoodSchema = z.object({
  mood: z.string().min(1).max(500),
  seed: z.number().int().optional(),
});

export const generateFromImageSchema = z.object({
  pixels: z
    .array(
      z.object({
        r: z.number().int().min(0).max(255),
        g: z.number().int().min(0).max(255),
        b: z.number().int().min(0).max(255),
      })
    )
    .min(1)
    .max(10000), // Limit to 10k pixels for performance
});

export type GenerateFromBaseColorInput = z.infer<
  typeof generateFromBaseColorSchema
>;
export type GenerateFromMoodInput = z.infer<typeof generateFromMoodSchema>;
export type GenerateFromImageInput = z.infer<typeof generateFromImageSchema>;
