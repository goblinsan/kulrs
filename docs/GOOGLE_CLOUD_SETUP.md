# Google Cloud Functions & Secret Manager Setup Guide

This guide explains how to configure secrets and environment variables for Google Cloud Functions using Secret Manager.

## Prerequisites

1. Google Cloud Project created
2. Billing enabled
3. `gcloud` CLI installed and configured
4. Required APIs enabled

## Initial Setup

### Install gcloud CLI

**macOS:**
```bash
brew install --cask google-cloud-sdk
```

**Linux:**
```bash
# Download and verify the installer before running
curl https://sdk.cloud.google.com > install-gcloud.sh
# Review the script content before executing
less install-gcloud.sh
# Run the installer
bash install-gcloud.sh
exec -l $SHELL
```

**Windows:**
Download from [Google Cloud SDK installer](https://cloud.google.com/sdk/docs/install)

**Note**: For production environments, always verify installation scripts from official sources before execution.

### Authenticate and Configure

```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Verify configuration
gcloud config list
```

### Enable Required APIs

```bash
# Enable Cloud Functions API
gcloud services enable cloudfunctions.googleapis.com

# Enable Cloud Build API (required for deployments)
gcloud services enable cloudbuild.googleapis.com

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Enable Cloud Run API (for 2nd gen functions)
gcloud services enable run.googleapis.com
```

## Secret Manager Setup

### Create Secrets

```bash
# Create database URL secret
echo -n "postgresql://user:pass@host:5432/kulrs" | \
  gcloud secrets create DATABASE_URL --data-file=-

# Create JWT secret
echo -n "your-jwt-secret-key-here" | \
  gcloud secrets create JWT_SECRET --data-file=-

# Create API key secret
echo -n "your-api-key-here" | \
  gcloud secrets create API_KEY --data-file=-
```

### List Secrets

```bash
# List all secrets
gcloud secrets list

# Describe a specific secret
gcloud secrets describe DATABASE_URL
```

### Update Secret Value

```bash
# Add new version
echo -n "new-secret-value" | \
  gcloud secrets versions add DATABASE_URL --data-file=-

# View versions
gcloud secrets versions list DATABASE_URL
```

### Grant Access to Secrets

By default, Cloud Functions use the default compute service account:
`PROJECT_ID@appspot.gserviceaccount.com`

```bash
# Grant access to DATABASE_URL secret
gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to JWT_SECRET secret
gcloud secrets add-iam-policy-binding JWT_SECRET \
  --member="serviceAccount:PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to API_KEY secret
gcloud secrets add-iam-policy-binding API_KEY \
  --member="serviceAccount:PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Cloud Functions Deployment

### Deploy Function with Secrets

```bash
gcloud functions deploy api-handler \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=./apps/backend \
  --entry-point=handler \
  --trigger-http \
  --allow-unauthenticated \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,API_KEY=API_KEY:latest" \
  --set-env-vars="NODE_ENV=production,CORS_ORIGIN=https://kulrs.com,LOG_LEVEL=info"
```

### Deployment Options Explained

- `--gen2`: Use 2nd generation Cloud Functions
- `--runtime=nodejs20`: Node.js 20 runtime
- `--region=us-central1`: Deployment region
- `--source=./apps/backend`: Source code directory
- `--entry-point=handler`: Exported function name
- `--trigger-http`: HTTP trigger
- `--allow-unauthenticated`: Allow public access (adjust based on needs)
- `--set-secrets`: Mount secrets as environment variables
- `--set-env-vars`: Set regular environment variables

### Deploy from YAML Configuration

Create `function.yaml`:

```yaml
runtime: nodejs20
entryPoint: handler
availableMemoryMb: 256
timeout: 60s
environmentVariables:
  NODE_ENV: production
  CORS_ORIGIN: https://kulrs.com
  LOG_LEVEL: info
secretEnvironmentVariables:
  - key: DATABASE_URL
    secret: DATABASE_URL
    version: latest
  - key: JWT_SECRET
    secret: JWT_SECRET
    version: latest
  - key: API_KEY
    secret: API_KEY
    version: latest
```

Deploy:
```bash
gcloud functions deploy api-handler \
  --gen2 \
  --region=us-central1 \
  --source=./apps/backend \
  --trigger-http \
  --allow-unauthenticated
```

## Accessing Secrets in Code

### Node.js Example

```javascript
// Secrets are automatically injected as environment variables
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
const apiKey = process.env.API_KEY;

// Regular environment variables
const nodeEnv = process.env.NODE_ENV;
const corsOrigin = process.env.CORS_ORIGIN;

// Example function
export async function handler(req, res) {
  console.log(`Environment: ${nodeEnv}`);
  
  // Use secrets (never log them!)
  // const db = await connectDatabase(databaseUrl);
  
  res.json({ message: 'Hello from Cloud Functions!' });
}
```

## Service Account Setup (for GitHub Actions)

### Create Deployment Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions-deploy \
  --display-name="GitHub Actions Deployment" \
  --description="Service account for GitHub Actions to deploy Cloud Functions"

# Get the email
export SA_EMAIL="github-actions-deploy@PROJECT_ID.iam.gserviceaccount.com"
```

### Grant Required Roles

```bash
# Cloud Functions Developer (deploy, update, delete functions)
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudfunctions.developer"

# Service Account User (required to deploy functions)
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Secret Manager Secret Accessor (access secrets)
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Cloud Build Editor (required for function builds)
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

# Storage Admin (required for uploading function source)
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"
```

### Create Service Account Key

```bash
# Create key file
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account="${SA_EMAIL}"

# Display key (add this to GitHub Secrets as GCP_SERVICE_ACCOUNT_KEY)
cat github-actions-key.json

# Delete local key file (for security)
rm github-actions-key.json
```

## Local Development

### Authenticate for Local Development

```bash
# Use your user account
gcloud auth application-default login

# Or use a service account
gcloud auth activate-service-account --key-file=service-account-key.json
```

### Functions Framework

Use Functions Framework for local testing:

```bash
# Install Functions Framework
npm install -g @google-cloud/functions-framework

# Run locally
functions-framework --target=handler --port=8080
```

### Access Secrets Locally

Create `.env.local` file:

```bash
# Do NOT commit this file
DATABASE_URL=postgresql://localhost:5432/kulrs_dev
JWT_SECRET=local-dev-secret
API_KEY=local-dev-api-key
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
```

Use with your local server:

```javascript
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}
```

## Monitoring and Logging

### View Function Logs

```bash
# View recent logs
gcloud functions logs read api-handler --gen2 --region=us-central1 --limit=50

# Stream logs in real-time
gcloud functions logs read api-handler --gen2 --region=us-central1 --follow
```

### View Logs in Console

1. Go to [Cloud Functions Console](https://console.cloud.google.com/functions)
2. Click on your function
3. Go to **Logs** tab
4. View logs in Cloud Logging

### Custom Logging

```javascript
// Use console.log for logs
console.log('Info message');
console.error('Error message');
console.warn('Warning message');

// Structured logging
console.log(JSON.stringify({
  severity: 'INFO',
  message: 'User logged in',
  userId: '12345',
  timestamp: new Date().toISOString()
}));
```

## Security Best Practices

1. **Use Secret Manager** for all sensitive data
2. **Rotate secrets regularly** - Update secret versions
3. **Principle of least privilege** - Grant minimal permissions
4. **Don't log secrets** - Never print secret values
5. **Use VPC if needed** - For database connections
6. **Enable Cloud Armor** - For DDoS protection
7. **Audit access** - Review Cloud Audit Logs
8. **Use different projects** - Separate dev/staging/prod

## Troubleshooting

### Permission Denied Errors

```bash
# Check IAM permissions
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SA_EMAIL}"

# Grant missing permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/ROLE_NAME"
```

### Secret Not Found

```bash
# Verify secret exists
gcloud secrets list

# Check IAM policy
gcloud secrets get-iam-policy SECRET_NAME

# Grant access if needed
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

### Function Deployment Failed

```bash
# Check Cloud Build logs
gcloud builds list --limit=5

# View specific build
gcloud builds describe BUILD_ID
```

## Cost Optimization

1. **Use appropriate memory** - Start with 256MB, adjust as needed
2. **Set timeout limits** - Don't use default 60s if unnecessary
3. **Use minimum instances** - Set to 0 for infrequent functions
4. **Enable request caching** - For idempotent operations
5. **Monitor usage** - Use Cloud Monitoring dashboards

## Additional Resources

- [Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cloud Functions Pricing](https://cloud.google.com/functions/pricing)
- [Best Practices](https://cloud.google.com/functions/docs/bestpractices/tips)
