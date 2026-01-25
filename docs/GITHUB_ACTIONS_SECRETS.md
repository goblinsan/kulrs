# GitHub Actions Secrets Configuration

This document describes the GitHub Actions secrets required for CI/CD workflows.

## Required Secrets

Configure these secrets in your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

### Web Application Deployment

| Secret Name | Description | How to Obtain |
|------------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages deployment permissions | Cloudflare Dashboard → My Profile → API Tokens → Create Token → Use "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Cloudflare Dashboard → Copy Account ID from sidebar |

### Backend/API Deployment (Google Cloud Functions)

| Secret Name | Description | How to Obtain |
|------------|-------------|---------------|
| `GCP_SERVICE_ACCOUNT_KEY` | Google Cloud service account key (JSON) | GCP Console → IAM & Admin → Service Accounts → Create/Select → Keys → Add Key → JSON |
| `GCP_PROJECT_ID` | Google Cloud project ID | GCP Console → Project dropdown → Copy Project ID |

### Optional Secrets

| Secret Name | Description | Used For |
|------------|-------------|----------|
| `CODECOV_TOKEN` | Code coverage reporting token | Codecov integration |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | Deployment notifications |

## Creating Secrets

### Cloudflare API Token

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **My Profile → API Tokens**
3. Click **Create Token**
4. Use the **Edit Cloudflare Workers** template
5. Configure:
   - Permissions: `Cloudflare Pages - Edit`
   - Account Resources: Include → Your Account
   - Zone Resources: Include → All zones
6. Click **Continue to summary** → **Create Token**
7. Copy the token immediately (it won't be shown again)
8. Add to GitHub as `CLOUDFLARE_API_TOKEN`

### Google Cloud Service Account Key

1. Log in to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **IAM & Admin → Service Accounts**
3. Create a new service account or select existing:
   - Name: `github-actions-deploy`
   - Description: `Service account for GitHub Actions deployments`
4. Grant roles:
   - `Cloud Functions Developer`
   - `Secret Manager Secret Accessor`
   - `Service Account User`
5. Click **Done**
6. Select the service account → **Keys** tab
7. Click **Add Key → Create new key**
8. Choose **JSON** format
9. Download the JSON key file
10. Add the entire JSON content to GitHub as `GCP_SERVICE_ACCOUNT_KEY`

## Usage in Workflows

### Example: Web Deployment to Cloudflare Pages

```yaml
name: Deploy Web to Cloudflare Pages

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        working-directory: apps/web
        env:
          VITE_API_URL: https://api.kulrs.com
          VITE_APP_ENV: production
        run: npm run build
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy apps/web/dist --project-name=kulrs-web
```

### Example: Backend Deployment to Google Cloud Functions

```yaml
name: Deploy Backend to GCF

on:
  push:
    branches: [main]
    paths:
      - 'apps/backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - name: Deploy to Cloud Functions
        run: |
          gcloud functions deploy my-api-function \
            --gen2 \
            --runtime=nodejs20 \
            --region=us-central1 \
            --source=./apps/backend \
            --entry-point=handler \
            --trigger-http \
            --allow-unauthenticated \
            --set-secrets="DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest" \
            --set-env-vars="NODE_ENV=production,CORS_ORIGIN=https://kulrs.com"
```

## Security Best Practices

1. **Rotate secrets regularly** - At least every 90 days
2. **Use environment-specific secrets** - Different tokens for staging/production
3. **Limit permissions** - Grant minimum required permissions
4. **Audit access** - Review who has access to secrets
5. **Never log secrets** - Avoid printing or logging secret values
6. **Use GitHub Environments** - For additional approval workflows

## Troubleshooting

### Secret Not Found

- Verify secret name matches exactly (case-sensitive)
- Check secret is added to repository (not organization)
- Ensure workflow has correct permissions

### Authentication Failed

- Verify secret value is correct (no extra spaces/newlines)
- For JSON keys, ensure entire content is copied
- Check token hasn't expired

### Permission Denied

- Verify service account has required roles
- Check API is enabled in GCP project
- Ensure IAM bindings are correct

## Additional Resources

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Cloudflare API Tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
