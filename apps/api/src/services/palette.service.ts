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
    const result = await db
      .insert(users)
      .values({
        firebaseUid,
        email: email || '',
      })
      .returning();

    return result[0];
  }

  /**
   * Create a new palette
   */
  async createPalette(userId: string, input: CreatePaletteInput) {
    // Create palette
    const paletteResult = await db
      .insert(palettes)
      .values({
        name: input.name,
        description: input.description,
        userId,
        sourceId: input.sourceId,
        isPublic: input.isPublic,
      })
      .returning();

    const palette = paletteResult[0];

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

    // Add auto-likes from bot users (1-5 initial likes for engagement)
    await this.addAutoLikes(palette.id);

    return palette;
  }

  /**
   * Add auto-likes from bot users to a palette
   * This creates initial engagement for site-generated content
   */
  async addAutoLikes(paletteId: string) {
    try {
      // Get bot users
      const botUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.isBot, true));

      if (botUsers.length === 0) {
        return 0;
      }

      // Randomly select 1-5 bots to like
      const numLikes = Math.floor(Math.random() * 5) + 1;
      const shuffledBots = [...botUsers].sort(() => Math.random() - 0.5);
      const selectedBots = shuffledBots.slice(0, Math.min(numLikes, shuffledBots.length));

      // Add likes
      for (const bot of selectedBots) {
        await db.insert(likes).values({
          userId: bot.id,
          paletteId,
        });
      }

      // Update likes count
      await db
        .update(palettes)
        .set({ likesCount: selectedBots.length })
        .where(eq(palettes.id, paletteId));

      return selectedBots.length;
    } catch (error) {
      console.error('Error adding auto-likes:', error);
      return 0;
    }
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

    // Get updated count
    const [palette] = await db
      .select({ likesCount: palettes.likesCount })
      .from(palettes)
      .where(eq(palettes.id, paletteId))
      .limit(1);

    return { alreadyLiked: false, likesCount: palette?.likesCount ?? 0 };
  }

  /**
   * Unlike a palette
   */
  async unlikePalette(userId: string, paletteId: string) {
    // Check if liked
    const [existing] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.paletteId, paletteId)))
      .limit(1);

    if (!existing) {
      return { wasLiked: false };
    }

    // Delete like record
    await db
      .delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.paletteId, paletteId)));

    // Decrement likes count
    await db
      .update(palettes)
      .set({ likesCount: sql`GREATEST(${palettes.likesCount} - 1, 0)` })
      .where(eq(palettes.id, paletteId));

    // Get updated count
    const [palette] = await db
      .select({ likesCount: palettes.likesCount })
      .from(palettes)
      .where(eq(palettes.id, paletteId))
      .limit(1);

    return { wasLiked: true, likesCount: palette?.likesCount ?? 0 };
  }

  /**
   * Get like info for a palette
   */
  async getLikeInfo(paletteId: string, userId: string | null) {
    // Get palette likes count
    const [palette] = await db
      .select({ likesCount: palettes.likesCount })
      .from(palettes)
      .where(eq(palettes.id, paletteId))
      .limit(1);

    if (!palette) {
      return { likesCount: 0, userLiked: false };
    }

    // Check if user has liked
    let userLiked = false;
    if (userId) {
      const [userLike] = await db
        .select()
        .from(likes)
        .where(and(eq(likes.userId, userId), eq(likes.paletteId, paletteId)))
        .limit(1);
      userLiked = !!userLike;
    }

    return {
      likesCount: palette.likesCount,
      userLiked,
    };
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
    const newPaletteResult = await db
      .insert(palettes)
      .values({
        name: `${originalPalette.name} (Remix)`,
        description: originalPalette.description,
        userId,
        sourceId: originalPalette.sourceId,
        isPublic: true,
      })
      .returning();

    const newPalette = newPaletteResult[0];

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
