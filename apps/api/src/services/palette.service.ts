import { eq, and, sql, asc } from 'drizzle-orm';
import { db } from '../config/database.js';
import { users, palettes, colors, paletteTags, likes, saves } from '@kulrs/db';
import { CreatePaletteInput } from '../utils/validation.js';

export class PaletteService {
  /**
   * Get or create user by Firebase UID
   */
  async getOrCreateUser(firebaseUid: string, email?: string) {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid))
      .limit(1);

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        firebaseUid,
        email: email || '',
      })
      .returning();

    return newUser;
  }

  /**
   * Create a new palette
   */
  async createPalette(userId: string, input: CreatePaletteInput) {
    // Create palette
    const [palette] = await db
      .insert(palettes)
      .values({
        name: input.name,
        description: input.description,
        userId,
        sourceId: input.sourceId,
        isPublic: input.isPublic,
      })
      .returning();

    // Create colors
    if (input.colors && input.colors.length > 0) {
      await db.insert(colors).values(
        input.colors.map(color => ({
          paletteId: palette.id,
          hexValue: color.hexValue,
          position: color.position,
          name: color.name,
        }))
      );
    }

    // Create palette tags
    if (input.tagIds && input.tagIds.length > 0) {
      await db.insert(paletteTags).values(
        input.tagIds.map(tagId => ({
          paletteId: palette.id,
          tagId,
        }))
      );
    }

    return palette;
  }

  /**
   * Save a palette for a user
   */
  async savePalette(userId: string, paletteId: string) {
    // Check if already saved
    const [existing] = await db
      .select()
      .from(saves)
      .where(and(eq(saves.userId, userId), eq(saves.paletteId, paletteId)))
      .limit(1);

    if (existing) {
      return { alreadySaved: true };
    }

    // Create save record
    await db.insert(saves).values({
      userId,
      paletteId,
    });

    // Increment saves count
    await db
      .update(palettes)
      .set({ savesCount: sql`${palettes.savesCount} + 1` })
      .where(eq(palettes.id, paletteId));

    return { alreadySaved: false };
  }

  /**
   * Like a palette
   */
  async likePalette(userId: string, paletteId: string) {
    // Check if already liked
    const [existing] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.paletteId, paletteId)))
      .limit(1);

    if (existing) {
      return { alreadyLiked: true };
    }

    // Create like record
    await db.insert(likes).values({
      userId,
      paletteId,
    });

    // Increment likes count
    await db
      .update(palettes)
      .set({ likesCount: sql`${palettes.likesCount} + 1` })
      .where(eq(palettes.id, paletteId));

    return { alreadyLiked: false };
  }

  /**
   * Remix a palette (create a copy)
   */
  async remixPalette(userId: string, paletteId: string) {
    // Get original palette with colors
    const [originalPalette] = await db
      .select()
      .from(palettes)
      .where(eq(palettes.id, paletteId))
      .limit(1);

    if (!originalPalette) {
      throw new Error('Palette not found');
    }

    const originalColors = await db
      .select()
      .from(colors)
      .where(eq(colors.paletteId, paletteId))
      .orderBy(asc(colors.position));

    // Create new palette
    const [newPalette] = await db
      .insert(palettes)
      .values({
        name: `${originalPalette.name} (Remix)`,
        description: originalPalette.description,
        userId,
        sourceId: originalPalette.sourceId,
        isPublic: true,
      })
      .returning();

    // Copy colors
    if (originalColors.length > 0) {
      await db.insert(colors).values(
        originalColors.map(color => ({
          paletteId: newPalette.id,
          hexValue: color.hexValue,
          position: color.position,
          name: color.name,
        }))
      );
    }

    return newPalette;
  }
}

export const paletteService = new PaletteService();
