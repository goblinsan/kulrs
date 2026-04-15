import { getDb } from '../src/client';
import { users, sources, palettes, colors, tags, paletteTags, likes } from '../src/schema';
import { generateAllSystemPalettes, getSystemPaletteThemeSlugs } from '@kulrs/shared';
import dotenv from 'dotenv';
import { eq, and } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

/**
 * Seed system-generated palettes into the database.
 *
 * This is idempotent — palettes are matched by name and skipped if they
 * already exist. Run with: `pnpm db:seed-system`
 */
async function seedSystemPalettes() {
  console.log('🎨 Seeding system-generated palettes...\n');

  const db = getDb();

  // 1. Ensure the "system" source exists
  const [existingSource] = await db
    .select()
    .from(sources)
    .where(eq(sources.name, 'system-generated'))
    .limit(1);

  let sourceId: string;
  if (existingSource) {
    sourceId = existingSource.id;
    console.log('  ⊙ Source "system-generated" already exists');
  } else {
    const [newSource] = await db
      .insert(sources)
      .values({ name: 'system-generated', description: 'Auto-generated system palettes for theme browsing' })
      .returning();
    sourceId = newSource.id;
    console.log('  ✓ Created source "system-generated"');
  }

  // 2. Ensure the "system" bot user exists (owns all system palettes)
  const systemUid = 'system-palette-bot';
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, systemUid))
    .limit(1);

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
    console.log('  ⊙ System bot user already exists');
  } else {
    const [newUser] = await db
      .insert(users)
      .values({ firebaseUid: systemUid, email: 'system@kulrs.bot', displayName: 'Kulrs', isBot: true })
      .returning();
    userId = newUser.id;
    console.log('  ✓ Created system bot user');
  }

  // 3. Ensure all required tags exist
  const themeSlugs = getSystemPaletteThemeSlugs();
  const allNeededTagSlugs = new Set<string>();
  // Collect unique tag slugs from generated palettes
  const allPalettes = generateAllSystemPalettes();
  for (const p of allPalettes) {
    for (const slug of p.tagSlugs) {
      allNeededTagSlugs.add(slug);
    }
  }

  console.log(`\n  → Ensuring ${allNeededTagSlugs.size} tags exist...`);
  const tagMap = new Map<string, string>(); // slug -> id
  const existingTags = await db.select().from(tags);
  for (const t of existingTags) {
    tagMap.set(t.slug, t.id);
  }

  for (const slug of allNeededTagSlugs) {
    if (!tagMap.has(slug)) {
      const label = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const [newTag] = await db
        .insert(tags)
        .values({ name: label, slug, description: `${label} palettes` })
        .returning();
      tagMap.set(slug, newTag.id);
      console.log(`    ✓ Created tag: ${label}`);
    }
  }

  // 4. Insert palettes in batches
  console.log(`\n  → Inserting ${allPalettes.length} palettes across ${themeSlugs.length} themes...`);

  let created = 0;
  let skipped = 0;

  for (const palette of allPalettes) {
    // Check if exists by name + userId (system bot)
    const [existing] = await db
      .select({ id: palettes.id })
      .from(palettes)
      .where(and(eq(palettes.name, palette.name), eq(palettes.userId, userId)))
      .limit(1);

    if (existing) {
      skipped++;
      continue;
    }

    // Insert palette
    const [newPalette] = await db
      .insert(palettes)
      .values({
        name: palette.name,
        description: palette.description,
        userId,
        sourceId,
        isPublic: true,
      })
      .returning();

    // Insert colors
    if (palette.colors.length > 0) {
      await db.insert(colors).values(
        palette.colors.map((hex, idx) => ({
          paletteId: newPalette.id,
          hexValue: hex,
          position: idx,
        }))
      );
    }

    // Insert tags
    for (const slug of palette.tagSlugs) {
      const tagId = tagMap.get(slug);
      if (tagId) {
        await db.insert(paletteTags).values({
          paletteId: newPalette.id,
          tagId,
        });
      }
    }

    created++;
  }

  console.log(`\n✅ System palette seeding complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped (already exist): ${skipped}`);
  console.log(`   Total themes: ${themeSlugs.length}`);
  process.exit(0);
}

seedSystemPalettes().catch((err) => {
  console.error('❌ System palette seeding failed:', err);
  process.exit(1);
});
