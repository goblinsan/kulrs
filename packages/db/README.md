# Database Package

This package contains the database schema, migrations, and utilities for the Kulrs application using Drizzle ORM and Neon Postgres.

## Setup

### Prerequisites

- Node.js 20+
- Neon Postgres database (see [Neon Setup Guide](../../docs/NEON_SETUP.md))

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in this directory:

```bash
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

For production, use Google Cloud Secret Manager (see [Google Cloud Setup Guide](../../docs/GOOGLE_CLOUD_SETUP.md)).

## Usage

### Generate Migrations

After modifying the schema in `src/schema/`:

```bash
npm run db:generate
```

This will create a new migration file in the `migrations/` directory.

### Run Migrations

Apply pending migrations to the database:

```bash
npm run db:migrate
```

### Seed Database

Populate the database with demo data (development only):

```bash
npm run db:seed
```

The seed script is idempotent and can be re-run safely.

### Promote to Production

Safely promote migrations from development to production:

```bash
# Set both database URLs
export DEV_DATABASE_URL="postgresql://..."
export PROD_DATABASE_URL="postgresql://..."

# Run promotion
npm run db:promote
```

This automated script:
- Validates both database connections
- Shows what migrations will be promoted
- Waits 5 seconds before applying changes
- Verifies both databases are in sync after promotion

### Drizzle Studio

Launch the Drizzle Studio GUI to explore your database:

```bash
npm run db:studio
```

## Schema

The database schema includes the following tables:

- **users** - User accounts (Firebase Auth integration)
- **palettes** - Color palettes
- **colors** - Individual colors in palettes
- **tags** - Tags for categorizing palettes
- **sources** - Source/origin of palettes (user-created, imported, etc.)
- **likes** - User likes on palettes
- **saves** - User saved palettes

See the [ERD diagram](../../docs/ERD.md) for a visual representation of the schema.

## Development

### Database Branching Strategy

We use Neon's branching feature to maintain separate databases for each environment:

- **Development** (`development` branch) - Local development and testing
- **Production** (`main` branch) - Live production data

See [Neon Setup Guide](../../docs/NEON_SETUP.md) for details on managing branches.

## Production Deployment

Migrations are automatically applied during deployment via Cloud Functions. The `DATABASE_URL` secret is injected from Google Cloud Secret Manager.

See [Deployment Guide](../../docs/DEPLOYMENT.md) for more information.
