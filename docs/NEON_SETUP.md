# Neon Database Setup Guide

This guide explains how to set up and manage Neon PostgreSQL databases for the Kulrs project.

## Overview

The Kulrs project uses [Neon](https://neon.tech/) as its PostgreSQL database provider. Neon offers serverless PostgreSQL with features like branching, autoscaling, and automatic backups.

## Database Environments

The project uses separate Neon databases for different environments:

- **Development Database**: Used for testing and development
- **Production Database**: Used for the live application

## Automated Promotion via GitHub Actions

The recommended approach for promoting database migrations to production is using the automated GitHub Actions workflow.

### Prerequisites

Before using the automated workflow, you need to configure two GitHub Secrets:

1. **DEV_DATABASE_URL**: Connection string for your development database
2. **PROD_DATABASE_URL**: Connection string for your production database

### Configuring GitHub Secrets

To set up the required secrets:

1. Navigate to your repository on GitHub
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:
   - **Name**: `DEV_DATABASE_URL`
     - **Value**: Your Neon development database connection string (e.g., `postgresql://user:password@host/dbname`)
   - **Name**: `PROD_DATABASE_URL`
     - **Value**: Your Neon production database connection string

For more information on GitHub Secrets, see [GitHub's documentation on using secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions).

### Triggering the Workflow

To promote migrations from development to production:

1. Navigate to the **Actions** tab in your GitHub repository
2. Select the **Promote Database Migrations** workflow from the left sidebar
3. Click the **Run workflow** button
4. Select the branch (usually `main`)
5. Click **Run workflow** to start the promotion

⚠️ **Important**: The promotion script includes a 5-second safety countdown before modifying the production database. Monitor the workflow logs and be prepared to cancel the workflow run if needed.

### What the Workflow Does

The workflow performs the following steps:

1. Checks out the repository code
2. Sets up Node.js (version 20)
3. Installs dependencies in the `packages/db` directory
4. Runs the `npm run db:promote` command with the configured database URLs
5. The promotion script safely copies migrations from development to production

### Production Deployment Best Practices

- **Always test migrations in development first** before promoting to production
- **Review the migration changes** carefully before running the workflow
- **Monitor the workflow execution** in the GitHub Actions tab
- **Keep your database connection strings secure** - never commit them to the repository
- **Consider running migrations during low-traffic periods** to minimize impact

## Manual Promotion (Alternative)

If you need to promote migrations manually without using GitHub Actions:

```bash
cd packages/db
export DEV_DATABASE_URL="your-dev-database-url"
export PROD_DATABASE_URL="your-prod-database-url"
npm run db:promote
```

However, using the GitHub Actions workflow is recommended for production deployments as it provides better audit trails and consistency.

## Database Connection Strings

Neon connection strings follow the standard PostgreSQL format:

```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

You can find your connection strings in the Neon console:
1. Log in to [Neon Console](https://console.neon.tech/)
2. Select your project
3. Navigate to the **Connection Details** section
4. Copy the connection string for your database

## Security Considerations

- Always use SSL/TLS connections (Neon enforces this by default)
- Rotate database passwords regularly
- Use separate databases for development and production
- Never expose database credentials in your code or logs
- Limit database user permissions to only what's necessary

## Troubleshooting

### Connection Issues

If you encounter connection issues:
- Verify your connection string is correct
- Check that SSL mode is enabled
- Ensure your IP is not blocked (Neon allows all IPs by default)

### Migration Issues

If migrations fail to promote:
- Check the GitHub Actions logs for detailed error messages
- Verify both databases are accessible
- Ensure migrations exist in the development database
- Contact support if issues persist
