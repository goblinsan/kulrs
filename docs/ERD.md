# Entity Relationship Diagram (ERD)

This document provides a visual and textual representation of the Kulrs database schema v1.

## Overview

The Kulrs database schema is designed to support a color palette sharing platform with the following core features:
- User accounts (integrated with Firebase Auth)
- Color palettes with multiple colors
- Tagging system for categorization
- Social features (likes and saves)
- Source tracking (user-created, imported, AI-generated)

## ERD Diagram

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ id (PK)         │
│ firebase_uid *  │◄─────────┐
│ email *         │          │
│ display_name    │          │
│ photo_url       │          │
│ created_at      │          │
│ updated_at      │          │
└─────────────────┘          │
         △                   │
         │                   │
         │ 1:N               │
         │                   │
┌────────▼────────┐          │
│   palettes      │          │
├─────────────────┤          │
│ id (PK)         │          │
│ name *          │          │
│ description     │          │
│ user_id (FK) *  │──────────┘
│ source_id (FK)  │───────┐
│ is_public *     │       │
│ likes_count *   │       │
│ saves_count *   │       │
│ created_at      │       │
│ updated_at      │       │
└─────────────────┘       │
    △   △   △             │
    │   │   │             │
    │   │   └──────────┐  │
    │   │              │  │
    │   │ 1:N          │  │        ┌─────────────────┐
    │   │              │  │        │    sources      │
    │   │   ┌──────────▼──┴────┐   ├─────────────────┤
    │   │   │      colors      │   │ id (PK)         │
    │   │   ├──────────────────┤   │ name * (U)      │
    │   │   │ id (PK)          │   │ description     │
    │   │   │ palette_id (FK)* │   │ created_at      │
    │   │   │ hex_value *      │   └─────────────────┘
    │   │   │ position *       │            △
    │   │   │ name             │            │
    │   │   │ created_at       │            │
    │   │   └──────────────────┘            │
    │   │                                   │
    │   │ N:M (via palette_tags)            │
    │   │                                   │
    │   │   ┌──────────────────┐            │
    │   │   │  palette_tags    │            │
    │   │   ├──────────────────┤            │
    │   │   │ id (PK)          │            │
    │   │   │ palette_id (FK)* │            │
    │   │   │ tag_id (FK) *    │───┐        │
    │   │   │ created_at       │   │        │
    │   │   └──────────────────┘   │        │
    │   │                           │        │
    │   │                           │        │
    │   │                           │        │
    │   │                      ┌────▼────────▼──┐
    │   │                      │      tags       │
    │   │                      ├─────────────────┤
    │   │                      │ id (PK)         │
    │   │                      │ name * (U)      │
    │   │                      │ slug * (U)      │
    │   │                      │ description     │
    │   │                      │ created_at      │
    │   │                      └─────────────────┘
    │   │
    │   │ 1:N
    │   │
    │   │   ┌──────────────────┐
    │   └───│      likes       │
    │       ├──────────────────┤
    │       │ id (PK)          │
    │       │ user_id (FK) *   │───┐
    │       │ palette_id (FK)* │   │
    │       │ created_at       │   │
    │       └──────────────────┘   │
    │                              │
    │ 1:N                          │
    │                              │
    │       ┌──────────────────┐   │
    └───────│      saves       │   │
            ├──────────────────┤   │
            │ id (PK)          │   │
            │ user_id (FK) *   │───┘
            │ palette_id (FK)* │
            │ created_at       │
            └──────────────────┘

Legend:
  PK  = Primary Key
  FK  = Foreign Key
  *   = NOT NULL
  U   = UNIQUE
  1:N = One-to-Many relationship
  N:M = Many-to-Many relationship
```

## Tables

### users
Stores user account information synced with Firebase Authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Internal user ID |
| firebase_uid | varchar(128) | NOT NULL, UNIQUE | Firebase Auth UID |
| email | varchar(255) | NOT NULL | User email address |
| display_name | varchar(255) | NULL | User display name |
| photo_url | text | NULL | Profile photo URL |
| created_at | timestamp | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `users_firebase_uid_idx` (UNIQUE) on `firebase_uid`
- `users_email_idx` on `email`

**Relationships:**
- One user has many palettes
- One user has many likes
- One user has many saves

---

### sources
Represents the origin/source of a palette (e.g., user-created, imported, AI-generated).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Source ID |
| name | varchar(100) | NOT NULL, UNIQUE | Source name |
| description | text | NULL | Source description |
| created_at | timestamp | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `sources_name_idx` (UNIQUE) on `name`

**Relationships:**
- One source has many palettes

---

### palettes
Stores color palettes created by users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Palette ID |
| name | varchar(255) | NOT NULL | Palette name |
| description | text | NULL | Palette description |
| user_id | uuid | NOT NULL, FK → users.id | Creator user ID |
| source_id | uuid | NULL, FK → sources.id | Source ID |
| is_public | boolean | NOT NULL, DEFAULT true | Public visibility flag |
| likes_count | integer | NOT NULL, DEFAULT 0 | Cached likes count |
| saves_count | integer | NOT NULL, DEFAULT 0 | Cached saves count |
| created_at | timestamp | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `palettes_user_id_idx` on `user_id`
- `palettes_source_id_idx` on `source_id`
- `palettes_is_public_idx` on `is_public`
- `palettes_created_at_idx` on `created_at`
- `palettes_likes_count_idx` on `likes_count`

**Relationships:**
- Each palette belongs to one user
- Each palette belongs to one source (optional)
- One palette has many colors
- One palette has many tags (via palette_tags)
- One palette has many likes
- One palette has many saves

**Cascade Deletes:**
- When a user is deleted, their palettes are deleted
- When a source is deleted, palette.source_id is set to NULL

---

### colors
Individual colors within a palette.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Color ID |
| palette_id | uuid | NOT NULL, FK → palettes.id | Parent palette ID |
| hex_value | varchar(7) | NOT NULL | Hex color value (e.g., #FF5733) |
| position | integer | NOT NULL | Order within palette (0-indexed) |
| name | varchar(100) | NULL | Optional color name |
| created_at | timestamp | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `colors_palette_id_idx` on `palette_id`
- `colors_palette_position_idx` on `(palette_id, position)`

**Relationships:**
- Each color belongs to one palette

**Cascade Deletes:**
- When a palette is deleted, its colors are deleted

---

### tags
Tags for categorizing palettes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Tag ID |
| name | varchar(50) | NOT NULL, UNIQUE | Tag display name |
| slug | varchar(50) | NOT NULL, UNIQUE | URL-friendly slug |
| description | text | NULL | Tag description |
| created_at | timestamp | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `tags_name_idx` (UNIQUE) on `name`
- `tags_slug_idx` (UNIQUE) on `slug`

**Relationships:**
- One tag has many palettes (via palette_tags)

---

### palette_tags
Junction table for many-to-many relationship between palettes and tags.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Relation ID |
| palette_id | uuid | NOT NULL, FK → palettes.id | Palette ID |
| tag_id | uuid | NOT NULL, FK → tags.id | Tag ID |
| created_at | timestamp | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `palette_tags_palette_tag_idx` (UNIQUE) on `(palette_id, tag_id)`
- `palette_tags_palette_id_idx` on `palette_id`
- `palette_tags_tag_id_idx` on `tag_id`

**Cascade Deletes:**
- When a palette is deleted, its tag relations are deleted
- When a tag is deleted, its palette relations are deleted

---

### likes
User likes on palettes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Like ID |
| user_id | uuid | NOT NULL, FK → users.id | User who liked |
| palette_id | uuid | NOT NULL, FK → palettes.id | Liked palette |
| created_at | timestamp | NOT NULL, DEFAULT NOW() | Like timestamp |

**Indexes:**
- `likes_user_palette_idx` (UNIQUE) on `(user_id, palette_id)`
- `likes_user_id_idx` on `user_id`
- `likes_palette_id_idx` on `palette_id`

**Relationships:**
- Each like belongs to one user
- Each like belongs to one palette

**Cascade Deletes:**
- When a user is deleted, their likes are deleted
- When a palette is deleted, its likes are deleted

**Business Rules:**
- A user can only like a palette once (enforced by unique index)

---

### saves
User saved/bookmarked palettes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Save ID |
| user_id | uuid | NOT NULL, FK → users.id | User who saved |
| palette_id | uuid | NOT NULL, FK → palettes.id | Saved palette |
| created_at | timestamp | NOT NULL, DEFAULT NOW() | Save timestamp |

**Indexes:**
- `saves_user_palette_idx` (UNIQUE) on `(user_id, palette_id)`
- `saves_user_id_idx` on `user_id`
- `saves_palette_id_idx` on `palette_id`

**Relationships:**
- Each save belongs to one user
- Each save belongs to one palette

**Cascade Deletes:**
- When a user is deleted, their saves are deleted
- When a palette is deleted, its saves are deleted

**Business Rules:**
- A user can only save a palette once (enforced by unique index)

---

## Key Design Decisions

### 1. UUID Primary Keys
All tables use UUID (v4) primary keys for:
- **Distributed systems** - No coordination needed for ID generation
- **Security** - Non-sequential IDs prevent enumeration attacks
- **Scalability** - Easy to merge data from multiple sources

### 2. Denormalized Counts
`palettes` table includes `likes_count` and `saves_count` for:
- **Performance** - Avoid expensive COUNT queries
- **Sorting** - Efficiently sort by popularity
- **Trade-off** - Must keep counts in sync (use triggers or application logic)

### 3. Cascade Deletes
Foreign keys use `ON DELETE CASCADE` where appropriate:
- **User deletion** - Removes all user-owned palettes, likes, and saves
- **Palette deletion** - Removes associated colors, tags, likes, and saves
- **Data integrity** - Prevents orphaned records

### 4. Indexes
Strategic indexes for common query patterns:
- **Lookups** - Unique indexes on frequently searched columns
- **Filtering** - Indexes on `is_public`, `created_at` for feed queries
- **Sorting** - Indexes on `likes_count` for trending palettes
- **Joins** - Indexes on all foreign keys

### 5. Timestamps
All tables include `created_at` for:
- **Auditing** - Track when records were created
- **Sorting** - Order by newest/oldest
- **Analytics** - Growth tracking

### 6. Soft vs Hard Deletes
Current schema uses **hard deletes** (CASCADE):
- **Simpler** - No need to filter `deleted_at IS NULL` everywhere
- **GDPR** - Easier to comply with "right to be forgotten"
- **Trade-off** - Cannot recover deleted data (use database backups if needed)

## Common Queries

### Get User's Palettes
```sql
SELECT p.*, COUNT(l.id) as like_count
FROM palettes p
LEFT JOIN likes l ON p.id = l.palette_id
WHERE p.user_id = $1
GROUP BY p.id
ORDER BY p.created_at DESC;
```

### Get Trending Palettes
```sql
SELECT p.*, u.display_name
FROM palettes p
JOIN users u ON p.user_id = u.id
WHERE p.is_public = true
ORDER BY p.likes_count DESC, p.created_at DESC
LIMIT 20;
```

### Get Palette with Colors and Tags
```sql
SELECT p.*, 
       json_agg(DISTINCT c.*) as colors,
       json_agg(DISTINCT t.*) as tags
FROM palettes p
LEFT JOIN colors c ON p.id = c.palette_id
LEFT JOIN palette_tags pt ON p.id = pt.palette_id
LEFT JOIN tags t ON pt.tag_id = t.id
WHERE p.id = $1
GROUP BY p.id;
```

### Search Palettes by Tag
```sql
SELECT DISTINCT p.*
FROM palettes p
JOIN palette_tags pt ON p.id = pt.palette_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.slug = $1 AND p.is_public = true
ORDER BY p.likes_count DESC;
```

## Future Enhancements

Potential schema additions for v2:

1. **Comments** - Allow users to comment on palettes
2. **Collections** - Users can create collections of palettes
3. **Followers** - User following system
4. **Color Variations** - Store color variations (tints, shades, tones)
5. **Export History** - Track palette exports (PNG, SVG, etc.)
6. **Color Accessibility** - Store contrast ratios and WCAG compliance
7. **Palette Versions** - Track palette edit history

## Migration Strategy

See [Database Package README](../packages/db/README.md) for:
- How to generate migrations
- How to apply migrations
- How to rollback changes
- Development workflow

## Related Documentation

- [Neon Setup Guide](./NEON_SETUP.md) - Database hosting and branching
- [Database Package](../packages/db/README.md) - Schema and migrations
- [Google Cloud Setup](./GOOGLE_CLOUD_SETUP.md) - Secret management
