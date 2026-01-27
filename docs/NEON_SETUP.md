# Neon Database Setup Guide

This guide explains how to set up and manage the Neon Postgres database for the Kulrs project.

## Overview

Kulrs uses [Neon](https://neon.tech/) as its PostgreSQL database provider. Neon offers:

- **Serverless Postgres** - Auto-scaling and usage-based pricing
- **Branching** - Database branches for dev/production
- **High Performance** - Fast cold starts and connection pooling
- **Easy Integration** - Works seamlessly with Vercel, Cloudflare, and Google Cloud

**Database Promotion**: The project includes automated tools for promoting migrations from development to production, including a GitHub Actions workflow for safe production deployments.

## Initial Setup

### 1. Create a Neon Account

1. Go to [neon.tech](https://neon.tech/)
2. Sign up with GitHub (recommended for easy integration)
3. Complete the onboarding flow

### 2. Create a Neon Project

```bash
# Option 1: Use Neon Console (Recommended for first-time setup)
# - Go to https://console.neon.tech/
# - Click "New Project"
# - Name: kulrs
# - Region: Choose closest to your users (e.g., US East for US)
# - Postgres Version: 16 (latest stable)

# Option 2: Use Neon CLI
npm install -g neonctl
neonctl auth
neonctl projects create --name kulrs --region aws-us-east-1
```

### 3. Neon Branching Strategy

Neon supports database branching similar to Git branches. We use the following strategy:

#### Branch Structure

```
main (production)
└── development
```

#### Branch Details

| Branch | Purpose | Environment | Auto-Delete |
|--------|---------|-------------|-------------|
| `main` | Production database | Production | Never |
| `development` | Local development & testing | Development | Never |

#### Create Branches

```bash
# Create development branch from main  
neonctl branches create --name development --parent main
```

**Note**: Each branch has its own connection string.

### 4. Get Connection Strings

For each branch, you'll need the connection string:

```bash
# Get connection string for main (production)
neonctl connection-string main

# Get connection string for development
neonctl connection-string development
```

Example connection string format:
```
postgresql://user:password@ep-example-123.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## Storing Connection Strings

### Development (Local)

Store in `.env.local` files:

```bash
# packages/db/.env.local
DATABASE_URL=postgresql://user:password@ep-dev-123.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Production (Google Cloud Secret Manager)

For secure secret storage, use Google Cloud Secret Manager:

#### 1. Create Secrets

```bash
# Set your development connection string
export DEV_DB_URL="postgresql://user:password@ep-dev-123..."

# Set your production connection string
export PROD_DB_URL="postgresql://user:password@ep-prod-123..."

# Create secrets in Google Cloud
echo -n "$DEV_DB_URL" | gcloud secrets create DATABASE_URL_DEV --data-file=-
echo -n "$PROD_DB_URL" | gcloud secrets create DATABASE_URL_PROD --data-file=-
```

#### 2. Grant Access

Grant Cloud Functions access to secrets:

```bash
# Replace YOUR_PROJECT_ID with your actual Google Cloud project ID
export PROJECT_ID="YOUR_PROJECT_ID"
export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"

# Grant access to development secret
gcloud secrets add-iam-policy-binding DATABASE_URL_DEV \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to production secret
gcloud secrets add-iam-policy-binding DATABASE_URL_PROD \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"
```

#### 3. Use in Cloud Functions

Deploy functions with the appropriate secret:

```bash
# Development function
gcloud functions deploy api-handler-dev \
  --set-secrets="DATABASE_URL=DATABASE_URL_DEV:latest"

# Production function
gcloud functions deploy api-handler \
  --set-secrets="DATABASE_URL=DATABASE_URL_PROD:latest"
```

## Database Schema Management

### 1. Install Dependencies

```bash
cd packages/db
npm install
```

### 2. Generate Migrations

After modifying the schema in `src/schema/`:

```bash
npm run db:generate
```

This creates SQL migration files in the `migrations/` directory.

### 3. Apply Migrations

Run migrations against your database:

```bash
# Development
npm run db:migrate

# Production (set DATABASE_URL first)
DATABASE_URL=$PROD_DB_URL npm run db:migrate
```

### 4. Seed Demo Data (Development Only)

```bash
npm run db:seed
```

The seed script is idempotent - it can be run multiple times safely.

### 5. Promote Migrations to Production

**Automated Promotion Script**

After testing migrations in development, use the promotion script to safely apply them to production:

```bash
# Set connection strings for both environments
export DEV_DATABASE_URL="postgresql://user:password@ep-dev-123..."
export PROD_DATABASE_URL="postgresql://user:password@ep-prod-123..."

# Run promotion script
npm run db:promote
```

The promotion script will:
1. ✅ Validate connections to both databases
2. ✅ Check which migrations are applied in each environment
3. ✅ Show you exactly what will be promoted
4. ⏸️ Wait 5 seconds before proceeding (giving you time to cancel)
5. ✅ Apply missing migrations to production
6. ✅ Verify both databases are in sync

**Safety Features:**
- Shows a clear diff of what will be promoted
- Includes a 5-second countdown before making changes
- Validates both databases are accessible before starting
- Verifies success by checking migration counts after promotion
- Exits with error if production has more migrations than dev (unexpected state)

**Best Practices:**
- Always test migrations in development first
- Review the migration list shown by the script before confirming
- Keep backups of production data (Neon provides automatic backups)
- Run during low-traffic periods for large schema changes

### 6. Automated Promotion via GitHub Actions (Recommended)

**For production deployments, use the GitHub Actions workflow instead of running the promotion script manually.**

The repository includes a GitHub Actions workflow (`.github/workflows/db-promote.yml`) that automates database migration promotion with better audit trails and consistency.

#### Prerequisites

Configure two GitHub Secrets in your repository:

1. Navigate to your repository on GitHub
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:
   - **Name**: `DEV_DATABASE_URL`
     - **Value**: Your Neon development database connection string
   - **Name**: `PROD_DATABASE_URL`
     - **Value**: Your Neon production database connection string

For more information, see [GitHub's documentation on using secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions).

#### Running the Workflow

To promote migrations from development to production:

1. Navigate to the **Actions** tab in your GitHub repository
2. Select the **Promote Database Migrations** workflow from the left sidebar
3. Click the **Run workflow** button
4. Select the branch (usually `main`)
5. Click **Run workflow** to start the promotion

⚠️ **Important**: The workflow includes the same 5-second safety countdown. Monitor the workflow logs and be prepared to cancel if needed.

#### What the Workflow Does

The automated workflow:
1. Checks out the repository code
2. Sets up Node.js (version 20)
3. Installs all workspace dependencies from the repository root with `npm ci`
4. Runs `npm run db:promote` (from packages/db) with the configured database URLs
5. Logs the complete promotion process for audit purposes

#### Why Use GitHub Actions?

- **Audit Trail**: All production deployments are logged in GitHub Actions
- **Consistency**: Same environment and process every time
- **Security**: Connection strings never leave GitHub Secrets
- **Collaboration**: Team members can see promotion history
- **Rollback**: Easy to identify when migrations were promoted

## Neon Console Features

Access the [Neon Console](https://console.neon.tech/) to:

### Branch Management
- Create new branches from any point in time
- Delete unused branches
- View branch hierarchy
- Monitor branch usage

### SQL Editor
- Run queries directly in the browser
- Test schema changes
- Debug data issues

### Monitoring
- View connection metrics
- Monitor query performance
- Track storage usage
- Set up usage alerts

### Settings
- Configure compute settings (auto-suspend, auto-scale)
- Manage connection pooling
- Set up branch protection rules
- Configure backups

## Branch Workflow

### Creating Feature Branches

For testing schema changes:

```bash
# Create a feature branch from development
neonctl branches create --name feature/new-table --parent development

# Get connection string
neonctl connection-string feature/new-table

# Test your changes
DATABASE_URL=<feature-branch-url> npm run db:migrate

# When done, delete the branch
neonctl branches delete feature/new-table
```

### Promoting Changes

Workflow for promoting schema changes:

1. **Development**: Test migrations on `development` branch
2. **Production**: Use automated promotion script to apply to `main` branch

```bash
# 1. Test on development
DATABASE_URL=$DEV_DB_URL npm run db:migrate

# 2. Promote to production using automation script
DEV_DATABASE_URL=$DEV_DB_URL PROD_DATABASE_URL=$PROD_DB_URL npm run db:promote
```

The promotion script automates the process and includes safety checks to prevent errors.

## Connection Pooling

Neon provides built-in connection pooling. For serverless environments (Cloud Functions), use pooled connections:

```javascript
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});
```

## Backup and Recovery

### Automatic Backups

Neon automatically maintains:
- **Point-in-time recovery** (7 days retention on free tier, 30+ on paid)
- **Branch snapshots** when creating new branches

### Manual Backups

Create a backup by branching:

```bash
# Create backup branch
neonctl branches create --name backup-$(date +%Y%m%d) --parent main
```

### Recovery

Restore from a point in time:

```bash
# Create a new branch from a specific timestamp
neonctl branches create --name recovery \
  --parent main \
  --timestamp "2024-01-20T10:00:00Z"
```

## Security Best Practices

1. **Never commit connection strings** - Always use `.env.local` (gitignored)
2. **Use Secret Manager** for production secrets
3. **Enable SSL** - Always use `?sslmode=require` in connection strings
4. **Rotate credentials** - Update passwords periodically
5. **Limit permissions** - Use read-only credentials for read-only operations
6. **Monitor access** - Review Neon audit logs regularly

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql "postgresql://user:password@ep-example-123.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Check SSL requirement
# Neon requires SSL - ensure ?sslmode=require is in connection string
```

### Migration Failures

```bash
# Check current schema version
# Use Neon SQL Editor or:
psql $DATABASE_URL -c "SELECT * FROM drizzle.__drizzle_migrations;"

# Rollback if needed (manual)
# Neon supports point-in-time recovery - create a new branch from before migration
neonctl branches create --name rollback --parent main --timestamp "2024-01-20T09:00:00Z"
```

### Performance Issues

1. **Check compute settings** - Increase compute units if needed
2. **Enable connection pooling** - Use pooled connections
3. **Add indexes** - Ensure proper indexes on frequently queried columns
4. **Monitor queries** - Use Neon's query analytics

## Cost Optimization

### Free Tier Limits
- 10 branches
- 3 GiB storage
- 100 hours compute time/month
- 7-day point-in-time recovery

### Tips
1. **Delete unused branches** - Keep only dev and prod
2. **Configure auto-suspend** - Set to 5 minutes for dev
3. **Monitor usage** - Set up alerts before hitting limits
4. **Use appropriate compute** - Start with smallest size, scale as needed

## Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [Neon CLI Reference](https://neon.tech/docs/reference/cli)
- [Drizzle ORM Guide](https://orm.drizzle.team/docs/overview)
- [Postgres Best Practices](https://www.postgresql.org/docs/current/performance-tips.html)

## Support

For Neon-specific issues:
- [Neon Community Discord](https://discord.gg/neon)
- [Neon GitHub Discussions](https://github.com/neondatabase/neon/discussions)
- Email: support@neon.tech
