import { pgTable, text, timestamp, uuid, varchar, boolean, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Users table
 * Stores user account information synced with Firebase Auth
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseUid: varchar('firebase_uid', { length: 128 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  photoUrl: text('photo_url'),
  isBot: boolean('is_bot').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  firebaseUidIdx: uniqueIndex('users_firebase_uid_idx').on(table.firebaseUid),
  emailIdx: index('users_email_idx').on(table.email),
  isBotIdx: index('users_is_bot_idx').on(table.isBot),
}));

/**
 * Sources table
 * Represents the origin/source of a palette (user-created, imported, AI-generated, etc.)
 */
export const sources = pgTable('sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex('sources_name_idx').on(table.name),
}));

/**
 * Palettes table
 * Stores color palettes
 */
export const palettes = pgTable('palettes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'set null' }),
  isPublic: boolean('is_public').notNull().default(true),
  likesCount: integer('likes_count').notNull().default(0),
  savesCount: integer('saves_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('palettes_user_id_idx').on(table.userId),
  sourceIdIdx: index('palettes_source_id_idx').on(table.sourceId),
  isPublicIdx: index('palettes_is_public_idx').on(table.isPublic),
  createdAtIdx: index('palettes_created_at_idx').on(table.createdAt),
  likesCountIdx: index('palettes_likes_count_idx').on(table.likesCount),
}));

/**
 * Colors table
 * Individual colors within a palette
 */
export const colors = pgTable('colors', {
  id: uuid('id').primaryKey().defaultRandom(),
  paletteId: uuid('palette_id').references(() => palettes.id, { onDelete: 'cascade' }).notNull(),
  hexValue: varchar('hex_value', { length: 7 }).notNull(), // e.g., #FF5733
  position: integer('position').notNull(), // Order within the palette (0-indexed)
  name: varchar('name', { length: 100 }), // Optional color name
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  paletteIdIdx: index('colors_palette_id_idx').on(table.paletteId),
  palettePositionIdx: index('colors_palette_position_idx').on(table.paletteId, table.position),
}));

/**
 * Tags table
 * Tags for categorizing palettes
 */
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex('tags_name_idx').on(table.name),
  slugIdx: uniqueIndex('tags_slug_idx').on(table.slug),
}));

/**
 * Palette Tags junction table
 * Many-to-many relationship between palettes and tags
 */
export const paletteTags = pgTable('palette_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  paletteId: uuid('palette_id').references(() => palettes.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  paletteTagIdx: uniqueIndex('palette_tags_palette_tag_idx').on(table.paletteId, table.tagId),
  paletteIdIdx: index('palette_tags_palette_id_idx').on(table.paletteId),
  tagIdIdx: index('palette_tags_tag_id_idx').on(table.tagId),
}));

/**
 * Likes table
 * User likes on palettes
 */
export const likes = pgTable('likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  paletteId: uuid('palette_id').references(() => palettes.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userPaletteIdx: uniqueIndex('likes_user_palette_idx').on(table.userId, table.paletteId),
  userIdIdx: index('likes_user_id_idx').on(table.userId),
  paletteIdIdx: index('likes_palette_id_idx').on(table.paletteId),
}));

/**
 * Saves table
 * User saved/bookmarked palettes
 */
export const saves = pgTable('saves', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  paletteId: uuid('palette_id').references(() => palettes.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userPaletteIdx: uniqueIndex('saves_user_palette_idx').on(table.userId, table.paletteId),
  userIdIdx: index('saves_user_id_idx').on(table.userId),
  paletteIdIdx: index('saves_palette_id_idx').on(table.paletteId),
}));
