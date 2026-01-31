import { z } from 'zod';

// OKLCH color schema
const oklchColorSchema = z.object({
  l: z.number().min(0).max(1),
  c: z.number().min(0).max(0.5),
  h: z.number().min(0).max(360),
});

// Assigned color schema (from generator)
const assignedColorSchema = z.object({
  role: z.string(),
  color: oklchColorSchema,
});

// Generated palette metadata schema
const paletteMetadataSchema = z.object({
  generator: z.string(),
  explanation: z.string(),
  timestamp: z.string(),
});

// Generated palette schema (from frontend generator)
export const generatedPaletteSchema = z.object({
  colors: z.array(assignedColorSchema).min(1).max(12),
  metadata: paletteMetadataSchema,
});

export const createPaletteSchema = z.object({
  // Accept the generated palette object from the frontend
  palette: generatedPaletteSchema,
  // Optional overrides
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().default(true),
  tagIds: z.array(z.string().uuid()).optional(),
});

export type CreatePaletteInput = z.infer<typeof createPaletteSchema>;

// Palette generator schemas
export const generateFromBaseColorSchema = z
  .object({
    // Support both single color (legacy) and array of colors
    color: oklchColorSchema.optional(),
    colors: z.array(oklchColorSchema).min(1).max(5).optional(),
    colorCount: z.number().int().min(2).max(5).optional().default(5),
  })
  .refine(
    data =>
      data.color !== undefined ||
      (data.colors !== undefined && data.colors.length > 0),
    { message: 'Either color or colors must be provided' }
  );

export const generateFromMoodSchema = z.object({
  mood: z.string().min(1).max(500),
  seed: z.number().int().optional(),
  colorCount: z.number().int().min(2).max(5).optional().default(5),
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
  colorCount: z.number().int().min(2).max(5).optional().default(5),
});

export type GenerateFromBaseColorInput = z.infer<
  typeof generateFromBaseColorSchema
>;
export type GenerateFromMoodInput = z.infer<typeof generateFromMoodSchema>;
export type GenerateFromImageInput = z.infer<typeof generateFromImageSchema>;
