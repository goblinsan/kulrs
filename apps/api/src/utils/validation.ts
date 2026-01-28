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
