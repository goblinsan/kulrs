import { relations } from 'drizzle-orm';
import { users, palettes, colors, tags, paletteTags, sources, likes, saves } from './tables';

/**
 * Define relationships between tables
 */

export const usersRelations = relations(users, ({ many }) => ({
  palettes: many(palettes),
  likes: many(likes),
  saves: many(saves),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  palettes: many(palettes),
}));

export const palettesRelations = relations(palettes, ({ one, many }) => ({
  user: one(users, {
    fields: [palettes.userId],
    references: [users.id],
  }),
  source: one(sources, {
    fields: [palettes.sourceId],
    references: [sources.id],
  }),
  colors: many(colors),
  paletteTags: many(paletteTags),
  likes: many(likes),
  saves: many(saves),
}));

export const colorsRelations = relations(colors, ({ one }) => ({
  palette: one(palettes, {
    fields: [colors.paletteId],
    references: [palettes.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  paletteTags: many(paletteTags),
}));

export const paletteTagsRelations = relations(paletteTags, ({ one }) => ({
  palette: one(palettes, {
    fields: [paletteTags.paletteId],
    references: [palettes.id],
  }),
  tag: one(tags, {
    fields: [paletteTags.tagId],
    references: [tags.id],
  }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  palette: one(palettes, {
    fields: [likes.paletteId],
    references: [palettes.id],
  }),
}));

export const savesRelations = relations(saves, ({ one }) => ({
  user: one(users, {
    fields: [saves.userId],
    references: [users.id],
  }),
  palette: one(palettes, {
    fields: [saves.paletteId],
    references: [palettes.id],
  }),
}));
