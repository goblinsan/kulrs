# Environments & Secrets Strategy

This document outlines the environment variables and secrets management strategy for the Kulrs project.

## Overview

The Kulrs project consists of three main applications:
- **Web App** (React + Vite) - Deployed to Cloudflare Pages
- **Mobile App** (Flutter) - Built and distributed via app stores
- **Backend/API** - Deployed to Google Cloud Functions (GCF)

## Environment Variable Naming Convention

All environment variables follow these naming conventions:

### Prefixes by Application

- **Web App (Vite)**: `VITE_` prefix for all client-side accessible variables
- **Backend/API**: No prefix requirement, but use descriptive names
- **Mobile App (Flutter)**: Use `--dart-define` flags, no prefix required

### Variable Categories

1. **Public Variables**: Safe to expose in client-side code
   - API endpoints
   - Feature flags
   - Public configuration

2. **Secret Variables**: Must never be exposed in client-side code
   - API keys
   - Database credentials
   - Authentication secrets
   - Third-party service tokens

## Environment Definitions

### Web Application

#### Public Variables (Client-Side Accessible)

| Variable Name | Description | Example Value | Required |
|--------------|-------------|---------------|----------|
| `VITE_API_URL` | Backend API base URL | `https://api.kulrs.com` | Yes |
| `VITE_APP_ENV` | Application environment | `development`, `staging`, `production` | Yes |
| `VITE_ENABLE_DEBUG` | Enable debug features | `true`, `false` | No |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | `AIzaSy...` | Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | `kulrs-xxxxx.firebaseapp.com` | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `kulrs-xxxxx` | Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | `kulrs-xxxxx.appspot.com` | Yes |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID | `123456789` | Yes |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | `1:123456789:web:abc...` | Yes |

#### Secret Variables (Server-Side Only)

Not applicable for Vite - secrets should never be in the web app.

### Backend/API (Google Cloud Functions)

#### Public Variables

| Variable Name | Description | Example Value | Required |
|--------------|-------------|---------------|----------|
| `NODE_ENV` | Node environment | `development`, `production` | Yes |
| `CORS_ORIGIN` | Allowed CORS origins | `https://kulrs.com` | Yes |
| `LOG_LEVEL` | Logging level | `info`, `debug`, `error` | No |

#### Secret Variables

| Variable Name | Description | Example Value | Required |
|--------------|-------------|---------------|----------|
| `DATABASE_URL` | Database connection string | `postgresql://user:pass@host:5432/db` | Yes |
| `JWT_SECRET` | JWT signing secret | `<random-string>` | Yes |
| `API_KEY` | Third-party API key | `<api-key>` | No |

### Mobile Application (Flutter)

#### Build-Time Variables

| Variable Name | Description | Example Value | Required |
|--------------|-------------|---------------|----------|
| `API_URL` | Backend API base URL | `https://api.kulrs.com` | Yes |
| `APP_ENV` | Application environment | `development`, `staging`, `production` | Yes |
| `ENABLE_ANALYTICS` | Enable analytics tracking | `true`, `false` | No |

**Note**: Firebase configuration for Flutter is handled via config files (`GoogleService-Info.plist` for iOS and `google-services.json` for Android) rather than environment variables. See [Firebase Setup Guide](FIREBASE_SETUP.md) for details.

#### Secret Variables

Secrets should not be embedded in the mobile app. Use backend APIs for sensitive operations.

## Local Development Strategy

### Web Application

1. **Environment Files**

   Create a `.env.local` file in `apps/web/`:
   ```bash
   VITE_API_URL=http://localhost:8080
   VITE_APP_ENV=development
   VITE_ENABLE_DEBUG=true
   
   # Firebase Configuration (get these from Firebase Console)
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=kulrs-xxxxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=kulrs-xxxxx
   VITE_FIREBASE_STORAGE_BUCKET=kulrs-xxxxx.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc...
   ```

2. **Never commit**: `.env.local` is gitignored by default
3. **Reference Template**: Use `.env.example` as a template

### Backend/API

1. **Environment Files**

   Create a `.env.local` file in your backend directory:
   ```bash
   NODE_ENV=development
   DATABASE_URL=postgresql://localhost:5432/kulrs_dev
   JWT_SECRET=local-development-secret
   CORS_ORIGIN=http://localhost:5173
   LOG_LEVEL=debug
   ```

2. **Google Cloud SDK**: Use `gcloud` for local emulation
   ```bash
   gcloud functions deploy <function-name> --env-vars-file .env.yaml
   ```

### Mobile Application

1. **Run with dart-define**:
   ```bash
   flutter run --dart-define=API_URL=http://localhost:8080 --dart-define=APP_ENV=development
   ```

2. **Create a run script** (`apps/mobile/run-dev.sh`):
   ```bash
   #!/bin/bash
   flutter run \
     --dart-define=API_URL=http://localhost:8080 \
     --dart-define=APP_ENV=development \
     --dart-define=ENABLE_ANALYTICS=false
   ```

3. **Access in Dart**:
   ```dart
   const String apiUrl = String.fromEnvironment('API_URL', defaultValue: 'https://api.kulrs.com');
   const String appEnv = String.fromEnvironment('APP_ENV', defaultValue: 'production');
   ```

## Deployment Platform Configuration

### GitHub Actions

Secrets are configured in repository settings: **Settings → Secrets and variables → Actions**

#### Required Secrets

| Secret Name | Description | Used In |
|------------|-------------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token for Pages deployment | Web deployment |
| `GCP_SERVICE_ACCOUNT_KEY` | GCP service account JSON key | Backend deployment |
| `GCP_PROJECT_ID` | Google Cloud project ID | Backend deployment |

#### Configuration Example

In your GitHub Actions workflow:
```yaml
- name: Deploy to Cloudflare Pages
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  run: npx wrangler pages deploy
```

### Cloudflare Pages/Workers

Environment variables are configured in the Cloudflare dashboard: **Pages → Settings → Environment Variables**

#### Configuration Steps

1. Navigate to your Pages project
2. Go to **Settings → Environment Variables**
3. Add variables for each environment (Production, Preview)

#### Example Variables

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `VITE_API_URL` | `https://api.kulrs.com` | Production |
| `VITE_API_URL` | `https://api-staging.kulrs.com` | Preview |
| `VITE_APP_ENV` | `production` | Production |
| `VITE_APP_ENV` | `staging` | Preview |

### Google Cloud Functions (GCF)

Secrets are managed via **Google Cloud Secret Manager**.

#### Setup Secret Manager

1. **Enable Secret Manager API**:
   ```bash
   gcloud services enable secretmanager.googleapis.com
   ```

2. **Create a secret**:
   ```bash
   echo -n "my-secret-value" | gcloud secrets create DATABASE_URL --data-file=-
   ```

3. **Grant access to Cloud Function**:
   ```bash
   gcloud secrets add-iam-policy-binding DATABASE_URL \
     --member="serviceAccount:PROJECT_ID@appspot.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

#### Use Secrets in Cloud Functions

1. **Configure in function deployment**:
   ```bash
   gcloud functions deploy my-function \
     --set-secrets="DATABASE_URL=DATABASE_URL:latest" \
     --set-env-vars="NODE_ENV=production,CORS_ORIGIN=https://kulrs.com"
   ```

2. **Access in code**:
   ```javascript
   // Secrets are available as environment variables
   const databaseUrl = process.env.DATABASE_URL;
   ```

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use different values** for each environment
3. **Rotate secrets** regularly
4. **Limit access** to production secrets
5. **Use Secret Manager** for sensitive data in GCP
6. **Audit access** to secrets regularly
7. **Client-side apps** should never contain secrets - use backend APIs

## Environment Examples

### Development
- Local databases
- Debug logging enabled
- Local API endpoints
- No analytics

### Staging
- Staging databases
- Info-level logging
- Staging API endpoints
- Analytics enabled

### Production
- Production databases
- Error-level logging
- Production API endpoints
- Analytics enabled
- Performance monitoring

## Troubleshooting

### Web App: Environment Variables Not Loading

- Ensure variable names start with `VITE_`
- Restart dev server after changing `.env.local`
- Check that `.env.local` is in `apps/web/` directory

### Backend: Secrets Not Accessible

- Verify Secret Manager IAM permissions
- Check secret name matches exactly
- Ensure secret version is `latest` or specify version

### Mobile: Build-time Variables Missing

- Verify `--dart-define` flags are passed
- Check for typos in variable names
- Ensure default values are set in code

## Additional Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/platform/build-configuration/)
- [Flutter dart-define](https://dart.dev/guides/environment-declarations)
