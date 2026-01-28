# Deployment Guide for Kulrs API (Google Cloud Functions)

This guide provides step-by-step instructions for deploying the Kulrs Write API to Google Cloud Functions.

## Prerequisites

Before deploying, ensure you have:

1. ✅ Google Cloud Project created
2. ✅ Billing enabled on the project
3. ✅ `gcloud` CLI installed and authenticated
4. ✅ Firebase project created and configured
5. ✅ Neon database created with migrations applied
6. ✅ Required secrets stored in Google Cloud Secret Manager

## Step 1: Enable Required APIs

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable run.googleapis.com
```

## Step 2: Create Secrets in Secret Manager

```bash
# Database URL secret (get from Neon console)
echo -n "postgresql://user:password@host:5432/kulrs" | \
  gcloud secrets create DATABASE_URL --data-file=-

# Verify secret was created
gcloud secrets list
```

## Step 3: Grant Secret Access to Cloud Functions

```bash
# Grant access to the default compute service account
gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 4: Build the API

```bash
# Navigate to the API directory
cd apps/api

# Install dependencies
npm install

# Build TypeScript
npm run build

# Verify build succeeded
ls -la dist/
```

## Step 5: Deploy to Google Cloud Functions

### Option A: Deploy via gcloud CLI

```bash
gcloud functions deploy kulrs-api \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --allow-unauthenticated \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest" \
  --set-env-vars="NODE_ENV=production,FIREBASE_PROJECT_ID=${PROJECT_ID},CORS_ORIGIN=https://your-app-domain.com,LOG_LEVEL=info" \
  --memory=256MB \
  --timeout=60s \
  --max-instances=10
```

### Option B: Deploy via CI/CD (GitHub Actions)

See `.github/workflows/deploy-api.yml` for automated deployment setup.

## Step 6: Verify Deployment

```bash
# Get the function URL
gcloud functions describe kulrs-api --gen2 --region=us-central1 --format="value(serviceConfig.uri)"

# Test the health endpoint
curl https://YOUR_FUNCTION_URL/health

# Test the hello endpoint
curl https://YOUR_FUNCTION_URL/hello
```

Expected response:
```json
{
  "message": "Hello from Kulrs API!",
  "environment": "production"
}
```

## Step 7: Test Authenticated Endpoints

You'll need a valid Firebase ID token to test authenticated endpoints.

### Get a Firebase ID Token

1. Use your web/mobile app to sign in a user
2. Get the ID token from the client
3. Use it in the Authorization header

### Test Create Palette Endpoint

```bash
# Get Firebase ID token from your app
export FIREBASE_TOKEN="your-firebase-id-token"

# Create a palette
curl -X POST https://YOUR_FUNCTION_URL/palettes \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sunset Colors",
    "description": "Warm sunset palette",
    "isPublic": true,
    "colors": [
      {"hexValue": "#FF6B6B", "position": 0, "name": "Coral"},
      {"hexValue": "#FFD93D", "position": 1, "name": "Golden"},
      {"hexValue": "#6BCF7F", "position": 2, "name": "Mint"}
    ]
  }'
```

Expected response (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "Sunset Colors",
    "description": "Warm sunset palette",
    "userId": "user-uuid",
    "isPublic": true,
    "likesCount": 0,
    "savesCount": 0,
    "createdAt": "2026-01-28T...",
    "updatedAt": "2026-01-28T..."
  }
}
```

## Step 8: Configure CORS for Production

Update the `CORS_ORIGIN` environment variable to include your production domain:

```bash
gcloud functions deploy kulrs-api \
  --gen2 \
  --region=us-central1 \
  --update-env-vars="CORS_ORIGIN=https://kulrs.com,https://www.kulrs.com"
```

## Step 9: Monitor and Logs

### View Logs

```bash
# View recent logs
gcloud functions logs read kulrs-api --gen2 --region=us-central1 --limit=50

# Stream logs in real-time
gcloud functions logs read kulrs-api --gen2 --region=us-central1 --follow
```

### Monitor Performance

1. Go to [Cloud Functions Console](https://console.cloud.google.com/functions)
2. Click on `kulrs-api`
3. View metrics: invocations, execution time, errors, memory usage

## Troubleshooting

### Issue: Function deployment fails

**Solution**: Check Cloud Build logs
```bash
gcloud builds list --limit=5
gcloud builds describe BUILD_ID
```

### Issue: "Permission denied" errors

**Solution**: Verify secret access
```bash
gcloud secrets get-iam-policy DATABASE_URL
```

### Issue: Firebase authentication errors

**Solution**: Ensure `FIREBASE_PROJECT_ID` matches your Firebase project
```bash
gcloud functions describe kulrs-api --gen2 --region=us-central1 --format="value(serviceConfig.environmentVariables)"
```

### Issue: Database connection errors

**Solution**: Verify DATABASE_URL secret
```bash
# Check secret exists
gcloud secrets describe DATABASE_URL

# Verify latest version
gcloud secrets versions list DATABASE_URL
```

### Issue: CORS errors from frontend

**Solution**: Update CORS_ORIGIN to include your frontend domain
```bash
# Check current CORS setting
gcloud functions describe kulrs-api --gen2 --region=us-central1

# Update CORS origin
gcloud functions deploy kulrs-api \
  --gen2 \
  --region=us-central1 \
  --update-env-vars="CORS_ORIGIN=https://your-frontend-domain.com"
```

## Production Best Practices

1. **Use separate environments**: Deploy separate functions for dev, staging, prod
2. **Set up monitoring**: Configure Cloud Monitoring alerts for errors
3. **Enable Cloud Armor**: Add DDoS protection if needed
4. **Implement rate limiting**: Use API Gateway or Cloud Armor for rate limiting
5. **Regular backups**: Ensure Neon database has automated backups
6. **Secret rotation**: Regularly rotate database credentials
7. **Cost monitoring**: Set up budget alerts in Cloud Console

## Cost Optimization

- **Memory**: Start with 256MB, adjust based on usage
- **Timeout**: Set to 60s, reduce if possible
- **Max instances**: Set based on expected traffic
- **Min instances**: Leave at 0 for cost savings (cold starts acceptable for write API)

## Next Steps

After deploying:

1. ✅ Update frontend environment variables with the function URL
2. ✅ Test all API endpoints from your web/mobile apps
3. ✅ Set up monitoring and alerts
4. ✅ Configure CI/CD for automated deployments
5. ✅ Document the deployed URL in your project docs

## Related Documentation

- [Google Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Neon Postgres Documentation](https://neon.tech/docs)
- [API README](./README.md)
- [Read Strategy ADR](../../docs/READ_STRATEGY.md)
