# Database Package

This package manages database schemas, migrations, and promotion workflows for the Kulrs project.

## Overview

The database package uses [Drizzle ORM](https://orm.drizzle.team/) for schema management and migrations, with [Neon PostgreSQL](https://neon.tech/) as the database provider.

## Automated Validation

### Migration Validation on Pull Requests

All pull requests that modify files in the `packages/db/` directory automatically trigger the **Database Migration Check** workflow. This workflow validates your changes before they can be merged.

**What gets validated:**
- ✅ Migrations directory structure is correct
- ✅ Schema can be generated without errors (`drizzle-kit generate`)
- ✅ Database package builds successfully
- ✅ No duplicate migration file names exist

**How it works:**
1. Create or modify database schema files in `packages/db/`
2. Open a pull request
3. The workflow runs automatically and provides a status check
4. Fix any issues reported by the validation workflow
5. Once all checks pass, the PR can be reviewed and merged

This automated validation helps catch issues early, before they reach production.

## Migration Workflow

The project uses a **two-step process** for database changes:

### Step 1: Validation (Automatic)

When you create a PR with database changes, the **Database Migration Check** workflow automatically:
- Validates your migration files are properly formatted
- Ensures the schema can be generated without errors
- Checks for common issues like naming conflicts
- Builds the package to verify everything compiles

**This validation does NOT modify any database** - it only checks that your changes are valid.

### Step 2: Production Promotion (Manual)

After your PR is merged, database changes must be manually promoted to production using the **Promote Database Migrations** workflow:

1. Navigate to the **Actions** tab in GitHub
2. Select **Promote Database Migrations** from the workflows list
3. Click **Run workflow** and confirm
4. Monitor the workflow execution

⚠️ **Important:** Only promote migrations after:
- The PR has been thoroughly reviewed
- Changes have been tested in development
- You're ready to modify the production database

For detailed instructions on production promotion, see [docs/NEON_SETUP.md](../../docs/NEON_SETUP.md).

## Development

### Prerequisites

- Node.js 20 or higher
- Access to development and production Neon databases
- Drizzle Kit installed (`npm install`)

### Common Commands

```bash
# Install dependencies
npm install

# Generate migrations from schema changes
npm run generate

# Apply migrations to development database
npm run migrate

# Build the package
npm run build

# Promote migrations to production (use GitHub Actions workflow instead)
npm run db:promote
```

### Schema Changes

1. Modify schema files in the `schema/` directory
2. Run `npm run generate` to create migration files
3. Test migrations in your development database
4. Open a PR - validation runs automatically
5. After PR is merged, use the GitHub Actions workflow to promote to production

## Configuration

Database connection strings are managed via environment variables:

- `DEV_DATABASE_URL`: Development database connection string
- `PROD_DATABASE_URL`: Production database connection string

**Never commit database credentials to the repository.** These are configured as GitHub Secrets for the workflows.

## Security

- All database operations in workflows use encrypted secrets
- Production promotion requires manual triggering (not automatic)
- Migrations are validated before being allowed to merge
- Connection strings are never exposed in logs or code

## Troubleshooting

### Validation Workflow Fails

If the Database Migration Check workflow fails:

1. Check the workflow logs for specific error messages
2. Common issues:
   - Syntax errors in schema files
   - Invalid migration file format
   - Missing dependencies
   - Duplicate migration file names
3. Fix the issues and push new commits to update the PR

### Migration Promotion Fails

If the production promotion fails:

1. Review the workflow logs in GitHub Actions
2. Verify database connection secrets are correctly configured
3. Ensure migrations exist in the development database
4. Check network connectivity and database permissions
5. See [docs/NEON_SETUP.md](../../docs/NEON_SETUP.md) for more details

## Learn More

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Neon Documentation](https://neon.tech/docs)
- [GitHub Actions Workflows](../../.github/workflows/)
- [Neon Setup Guide](../../docs/NEON_SETUP.md)
