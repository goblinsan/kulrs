import { eq, and, or, sql, asc, desc, inArray, ilike, ne } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  users,
  palettes,
  colors,
  paletteTags,
  tags as tagsTable,
  likes,
  saves,
} from '@kulrs/db';
import { CreatePaletteInput } from '../utils/validation.js';
import { oklchToRgb } from '@kulrs/shared';
import { NotFoundError } from '../utils/errors.js';

/**
 * Convert OKLCH color to hex string
 */
function oklchToHex(oklch: { l: number; c: number; h: number }): string {
  const rgb = oklchToRgb(oklch);
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

/**
 * Simple in-memory cache for user lookups.
 * Avoids a DB round-trip on every authenticated request for the same user.
 * TTL: 5 minutes.  Evicted lazily on next read.
 */
const USER_CACHE_TTL_MS = 5 * 60 * 1000;
interface CachedUser {
  data: {
    id: string;
    firebaseUid: string;
    email: string | null;
    displayName: string | null;
    photoUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  expiresAt: number;
}
const userCache = new Map<string, CachedUser>();

export class PaletteService {
  /**
   * Get or create user by Firebase UID (with per-instance cache)
   */
  async getOrCreateUser(firebaseUid: string, email?: string) {
    // Check cache first
    const cached = userCache.get(firebaseUid);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    // Evict stale entry
    if (cached) userCache.delete(firebaseUid);

    const [existingUser] = await db
      .select({
        id: users.id,
        firebaseUid: users.firebaseUid,
        email: users.email,
        displayName: users.displayName,
        photoUrl: users.photoUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid))
      .limit(1);

    if (existingUser) {
      userCache.set(firebaseUid, {
        data: existingUser,
        expiresAt: Date.now() + USER_CACHE_TTL_MS,
      });
      return existingUser;
    }

    // Create new user - only insert required fields
    const result = await db
      .insert(users)
      .values({
        firebaseUid,
        email: email || '',
      })
      .returning({
        id: users.id,
        firebaseUid: users.firebaseUid,
        email: users.email,
        displayName: users.displayName,
        photoUrl: users.photoUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    const newUser = result[0];
    userCache.set(firebaseUid, {
      data: newUser,
      expiresAt: Date.now() + USER_CACHE_TTL_MS,
    });
    return newUser;
  }

  /**
   * Create a new palette from a generated palette
   */
  async createPalette(userId: string, input: CreatePaletteInput) {
    const { palette: generatedPalette } = input;

    // Generate a name from the generator type or use provided name
    const paletteName =
      input.name || `${generatedPalette.metadata.generator} palette`;

    // Create palette
    const paletteResult = await db
      .insert(palettes)
      .values({
        name: paletteName,
        description: input.description || generatedPalette.metadata.explanation,
        userId,
        isPublic: input.isPublic ?? true,
      })
      .returning();

    const palette = paletteResult[0];

    // Create colors from the generated palette
    if (generatedPalette.colors && generatedPalette.colors.length > 0) {
      await db.insert(colors).values(
        generatedPalette.colors.map((assignedColor, index) => ({
          paletteId: palette.id,
          hexValue: oklchToHex(assignedColor.color),
          position: index,
          name: assignedColor.role,
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
   * Delete a palette owned by the given user.
   * Cascade-deletes colors, likes, saves, and tags via FK constraints.
   */
  async deletePalette(userId: string, paletteId: string) {
    // Verify ownership
    const [palette] = await db
      .select({ id: palettes.id, userId: palettes.userId })
      .from(palettes)
      .where(and(eq(palettes.id, paletteId), eq(palettes.userId, userId)))
      .limit(1);

    if (!palette) {
      throw new NotFoundError('Palette not found or not owned by user');
    }

    await db.delete(palettes).where(eq(palettes.id, paletteId));

    return { deleted: true };
  }

  /**
   * Get or create an anonymous user by device ID.
   * Allows unauthenticated visitors to like palettes.
   */
  async getOrCreateAnonymousUser(deviceId: string) {
    const anonUid = `anon-${deviceId}`;

    // Try to find the user first (fast path for repeat visitors)
    const [existing] = await db
      .select({ id: users.id, firebaseUid: users.firebaseUid })
      .from(users)
      .where(eq(users.firebaseUid, anonUid))
      .limit(1);

    if (existing) return existing;

    // User doesn't exist — try to insert. If another request raced us and
    // inserted first, catch the unique-constraint violation and SELECT again.
    try {
      const [created] = await db
        .insert(users)
        .values({ firebaseUid: anonUid, email: '' })
        .returning({ id: users.id, firebaseUid: users.firebaseUid });
      return created;
    } catch {
      // Unique-constraint violation — another request created the user
      const [raced] = await db
        .select({ id: users.id, firebaseUid: users.firebaseUid })
        .from(users)
        .where(eq(users.firebaseUid, anonUid))
        .limit(1);
      if (!raced) {
        throw new Error(
          `Failed to resolve anonymous user for device ${deviceId}`
        );
      }
      return raced;
    }
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
      throw new NotFoundError('Palette not found');
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
        sourceId: originalPalette.id,
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

  /**
   * Browse public palettes with sorting and filtering.
   * Deduplicates palettes that share the same colors in the same order,
   * keeping only the earliest-created instance.
   */
  async browsePalettes(options: {
    sort: 'recent' | 'popular';
    userId?: string;
    limit: number;
    offset: number;
    viewerUserId?: string | null;
    /** Filter by tag slugs — palettes matching ANY of the given slugs are returned. */
    tags?: string[];
    /** Case-insensitive substring search across palette name and description. */
    q?: string;
  }) {
    const { sort, userId, limit, offset, viewerUserId } = options;

    // Build query conditions
    const conditions = [eq(palettes.isPublic, true)];
    if (userId) {
      conditions.push(eq(palettes.userId, userId));
    }
    // For popular sort, only show palettes that have at least one like
    if (sort === 'popular') {
      conditions.push(sql`${palettes.likesCount} > 0`);
    }

    // Tag filtering: keep only palettes that have at least one of the requested tags
    if (options.tags && options.tags.length > 0) {
      const taggedRows = await db
        .selectDistinct({ paletteId: paletteTags.paletteId })
        .from(paletteTags)
        .innerJoin(tagsTable, eq(paletteTags.tagId, tagsTable.id))
        .where(inArray(tagsTable.slug, options.tags));

      if (taggedRows.length === 0) return [];
      conditions.push(
        inArray(
          palettes.id,
          taggedRows.map(r => r.paletteId)
        )
      );
    }

    // Text search across name and description
    if (options.q) {
      const pattern = `%${options.q}%`;
      const searchCond = or(
        ilike(palettes.name, pattern),
        ilike(palettes.description, pattern)
      );
      if (searchCond) conditions.push(searchCond);
    }

    // Build order by
    const orderBy =
      sort === 'popular'
        ? [desc(palettes.likesCount), desc(palettes.createdAt)]
        : [desc(palettes.createdAt)];

    // Clamp limit to a safe ceiling (routes should already clamp, belt & braces)
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const safeOffset = Math.max(0, offset);

    // Fetch moderately more than requested to account for post-dedup removal,
    // but never an unbounded amount.  Capped at 100 rows.
    const fetchLimit = Math.min(safeLimit * 2, 100);

    const paletteResults = await db
      .select({
        id: palettes.id,
        name: palettes.name,
        description: palettes.description,
        userId: palettes.userId,
        isPublic: palettes.isPublic,
        likesCount: palettes.likesCount,
        savesCount: palettes.savesCount,
        createdAt: palettes.createdAt,
      })
      .from(palettes)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(fetchLimit);

    if (paletteResults.length === 0) return [];

    // Batch-fetch all colors in a single query instead of N+1
    const paletteIds = paletteResults.map(p => p.id);
    const allColors = await db
      .select({
        id: colors.id,
        paletteId: colors.paletteId,
        hexValue: colors.hexValue,
        position: colors.position,
        name: colors.name,
      })
      .from(colors)
      .where(inArray(colors.paletteId, paletteIds))
      .orderBy(asc(colors.position));

    // Group colors by paletteId
    const colorsByPalette = new Map<string, typeof allColors>();
    for (const c of allColors) {
      const arr = colorsByPalette.get(c.paletteId) || [];
      arr.push(c);
      colorsByPalette.set(c.paletteId, arr);
    }

    // Batch-fetch viewer's likes in a single query
    let likedPaletteIds = new Set<string>();
    if (viewerUserId) {
      const userLikes = await db
        .select({ paletteId: likes.paletteId })
        .from(likes)
        .where(
          and(
            eq(likes.userId, viewerUserId),
            inArray(likes.paletteId, paletteIds)
          )
        );
      likedPaletteIds = new Set(userLikes.map(l => l.paletteId));
    }

    const palettesWithColors = paletteResults.map(palette => ({
      ...palette,
      colors: (colorsByPalette.get(palette.id) || []).map(c => ({
        id: c.id,
        hexValue: c.hexValue,
        position: c.position,
        name: c.name,
      })),
      userLiked: likedPaletteIds.has(palette.id),
    }));

    // Deduplicate: build a color signature from ordered hex values.
    const seen = new Set<string>();
    const deduplicated = palettesWithColors.filter(palette => {
      const colorSignature = palette.colors
        .map(c => c.hexValue.toUpperCase())
        .join(',');
      if (seen.has(colorSignature)) {
        return false;
      }
      seen.add(colorSignature);
      return true;
    });

    // Apply offset and limit after deduplication
    return deduplicated.slice(safeOffset, safeOffset + safeLimit);
  }

  /**
   * Get palettes for a specific user
   */
  async getUserPalettes(
    userId: string,
    options: { limit: number; offset: number }
  ) {
    const limit = Math.min(Math.max(1, options.limit), 50);
    const offset = Math.max(0, options.offset);

    const paletteResults = await db
      .select({
        id: palettes.id,
        name: palettes.name,
        description: palettes.description,
        userId: palettes.userId,
        isPublic: palettes.isPublic,
        likesCount: palettes.likesCount,
        savesCount: palettes.savesCount,
        createdAt: palettes.createdAt,
      })
      .from(palettes)
      .where(eq(palettes.userId, userId))
      .orderBy(desc(palettes.createdAt))
      .limit(limit)
      .offset(offset);

    if (paletteResults.length === 0) return [];

    // Batch-fetch all colors in a single query
    const paletteIds = paletteResults.map(p => p.id);
    const allColors = await db
      .select({
        id: colors.id,
        paletteId: colors.paletteId,
        hexValue: colors.hexValue,
        position: colors.position,
        name: colors.name,
      })
      .from(colors)
      .where(inArray(colors.paletteId, paletteIds))
      .orderBy(asc(colors.position));

    const colorsByPalette = new Map<string, typeof allColors>();
    for (const c of allColors) {
      const arr = colorsByPalette.get(c.paletteId) || [];
      arr.push(c);
      colorsByPalette.set(c.paletteId, arr);
    }

    return paletteResults.map(palette => ({
      ...palette,
      colors: (colorsByPalette.get(palette.id) || []).map(c => ({
        id: c.id,
        hexValue: c.hexValue,
        position: c.position,
        name: c.name,
      })),
    }));
  }

  /**
   * Update the colors of a palette owned by the given user.
   * Replaces all existing colors with the provided set.
   */
  async updatePaletteColors(
    userId: string,
    paletteId: string,
    newColors: Array<{ hexValue: string; position: number; name: string }>
  ) {
    const [palette] = await db
      .select({ id: palettes.id, userId: palettes.userId })
      .from(palettes)
      .where(and(eq(palettes.id, paletteId), eq(palettes.userId, userId)))
      .limit(1);

    if (!palette) {
      throw new NotFoundError('Palette not found or not owned by user');
    }

    await db.delete(colors).where(eq(colors.paletteId, paletteId));

    if (newColors.length > 0) {
      await db.insert(colors).values(
        newColors.map(c => ({
          paletteId,
          hexValue: c.hexValue,
          position: c.position,
          name: c.name,
        }))
      );
    }

    return { updated: true };
  }

  /**
   * Get a palette by ID with its colors
   */
  async getPaletteById(paletteId: string) {
    const [palette] = await db
      .select({
        id: palettes.id,
        name: palettes.name,
        description: palettes.description,
        userId: palettes.userId,
        isPublic: palettes.isPublic,
        likesCount: palettes.likesCount,
        savesCount: palettes.savesCount,
        createdAt: palettes.createdAt,
      })
      .from(palettes)
      .where(eq(palettes.id, paletteId))
      .limit(1);

    if (!palette) {
      return null;
    }

    const paletteColors = await db
      .select({
        id: colors.id,
        hexValue: colors.hexValue,
        position: colors.position,
        name: colors.name,
      })
      .from(colors)
      .where(eq(colors.paletteId, palette.id))
      .orderBy(asc(colors.position));

    return {
      ...palette,
      colors: paletteColors,
    };
  }
  /**
   * Get all available tags, ordered alphabetically.
   */
  async getAllTags() {
    return db
      .select({
        id: tagsTable.id,
        name: tagsTable.name,
        slug: tagsTable.slug,
        description: tagsTable.description,
      })
      .from(tagsTable)
      .orderBy(asc(tagsTable.name));
  }

  /**
   * Find public palettes related to the given palette via shared tags.
   * Palettes are ranked by the number of tags they share with the source palette.
   * Falls back to most-popular public palettes when the source has no tags.
   */
  async getRelatedPalettes(
    paletteId: string,
    options: { limit: number; viewerUserId?: string | null }
  ) {
    const { limit, viewerUserId } = options;
    const safeLimit = Math.min(Math.max(1, limit), 20);
    // Over-fetch factor: private palettes are filtered out after the tag query,
    // so we fetch more candidates to ensure we can fill the requested limit.
    const OVERFETCH_FACTOR = 3;

    // Collect tags for this palette
    const ptRows = await db
      .select({ tagId: paletteTags.tagId })
      .from(paletteTags)
      .where(eq(paletteTags.paletteId, paletteId));

    const tagIds = ptRows.map(r => r.tagId);

    let relatedIds: string[];

    if (tagIds.length === 0) {
      // No tags — fall back to most-popular public palettes
      const popular = await db
        .select({ id: palettes.id })
        .from(palettes)
        .where(and(eq(palettes.isPublic, true), ne(palettes.id, paletteId)))
        .orderBy(desc(palettes.likesCount), desc(palettes.createdAt))
        .limit(safeLimit);
      relatedIds = popular.map(p => p.id);
    } else {
      // Find palettes sharing the most tags
      const scored = await db
        .select({
          paletteId: paletteTags.paletteId,
          sharedCount: sql<number>`count(*)`.as('shared_count'),
        })
        .from(paletteTags)
        .where(
          and(
            inArray(paletteTags.tagId, tagIds),
            ne(paletteTags.paletteId, paletteId)
          )
        )
        .groupBy(paletteTags.paletteId)
        .orderBy(desc(sql`count(*)`))
        .limit(safeLimit * OVERFETCH_FACTOR);

      relatedIds = scored.map(r => r.paletteId);
    }

    if (relatedIds.length === 0) return [];

    // Fetch the palette rows and restrict to public only
    const paletteResults = await db
      .select({
        id: palettes.id,
        name: palettes.name,
        description: palettes.description,
        userId: palettes.userId,
        isPublic: palettes.isPublic,
        likesCount: palettes.likesCount,
        savesCount: palettes.savesCount,
        createdAt: palettes.createdAt,
      })
      .from(palettes)
      .where(
        and(inArray(palettes.id, relatedIds), eq(palettes.isPublic, true))
      );

    if (paletteResults.length === 0) return [];

    // Preserve the tag-overlap ordering
    const paletteMap = new Map(paletteResults.map(p => [p.id, p]));
    const ordered = relatedIds
      .map(id => paletteMap.get(id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .slice(0, safeLimit);

    // Batch-fetch colors
    const orderedIds = ordered.map(p => p.id);
    const allColors = await db
      .select({
        id: colors.id,
        paletteId: colors.paletteId,
        hexValue: colors.hexValue,
        position: colors.position,
        name: colors.name,
      })
      .from(colors)
      .where(inArray(colors.paletteId, orderedIds))
      .orderBy(asc(colors.position));

    const colorsByPalette = new Map<string, typeof allColors>();
    for (const c of allColors) {
      const arr = colorsByPalette.get(c.paletteId) ?? [];
      arr.push(c);
      colorsByPalette.set(c.paletteId, arr);
    }

    // Batch-fetch viewer likes
    let likedPaletteIds = new Set<string>();
    if (viewerUserId) {
      const userLikes = await db
        .select({ paletteId: likes.paletteId })
        .from(likes)
        .where(
          and(
            eq(likes.userId, viewerUserId),
            inArray(likes.paletteId, orderedIds)
          )
        );
      likedPaletteIds = new Set(userLikes.map(l => l.paletteId));
    }

    return ordered.map(palette => ({
      ...palette,
      colors: (colorsByPalette.get(palette.id) ?? []).map(c => ({
        id: c.id,
        hexValue: c.hexValue,
        position: c.position,
        name: c.name,
      })),
      userLiked: likedPaletteIds.has(palette.id),
    }));
  }
}

export const paletteService = new PaletteService();
