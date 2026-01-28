# Kulrs API (Google Cloud Functions)

Write API for the Kulrs application, deployed as Google Cloud Functions.

## Overview

This is a TypeScript-based API that provides write endpoints for:
- Creating color palettes
- Saving palettes
- Liking palettes
- Remixing palettes

All write endpoints require Firebase Authentication.

## Architecture

- **Runtime**: Node.js 20 with TypeScript
- **Framework**: Express.js with Google Cloud Functions Framework
- **Authentication**: Firebase Admin SDK for ID token verification
- **Database**: Neon Postgres via Drizzle ORM (using `@kulrs/db` package)
- **Validation**: Zod for request validation

## Prerequisites

- Node.js 20+
- npm
- Firebase project with Authentication enabled
- Neon database (connection string)
- Google Cloud CLI (for deployment)

## Local Development

### Installation

```bash
# Install dependencies
npm install
```

### Environment Variables

Create `.env.local` file:

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id

# Database
DATABASE_URL=postgresql://user:pass@host:5432/kulrs

# Environment
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
```

### Running Locally

You need to run two processes:

**Terminal 1 - TypeScript Compiler (watch mode):**
```bash
npm run dev:watch
```

**Terminal 2 - Functions Framework:**
```bash
npm run dev
```

The API will be available at `http://localhost:8080`.

### Firebase Authentication for Local Development

For local development, you need to authenticate with Firebase:

```bash
# Login with your Google account
gcloud auth application-default login
```

This will use Application Default Credentials to authenticate with Firebase.

Alternatively, you can use a service account key file:
1. Download a service account key from Firebase Console
2. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
3. **Never commit this file to the repository**

## API Endpoints

### Health Check
```
GET /health
```
No authentication required.

### Hello
```
GET /hello
```
No authentication required. Returns API status and environment.

### Create Palette
```
POST /palettes
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "name": "Sunset Colors",
  "description": "Warm sunset palette",
  "isPublic": true,
  "colors": [
    { "hexValue": "#FF6B6B", "position": 0, "name": "Coral" },
    { "hexValue": "#FFD93D", "position": 1, "name": "Golden" },
    { "hexValue": "#6BCF7F", "position": 2, "name": "Mint" }
  ],
  "tagIds": ["uuid-1", "uuid-2"]
}
```

### Save Palette
```
POST /palettes/:id/save
Authorization: Bearer <firebase-id-token>
```

### Like Palette
```
POST /palettes/:id/like
Authorization: Bearer <firebase-id-token>
```

### Remix Palette
```
POST /palettes/:id/remix
Authorization: Bearer <firebase-id-token>
```

## Testing

### Run Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

## Code Quality

### Linting
```bash
npm run lint       # Check for issues
npm run lint:fix   # Auto-fix issues
```

### Formatting
```bash
npm run format        # Format code
npm run format:check  # Check formatting
```

## Deployment

### Automated Deployment (CI/CD)

The API automatically deploys to Google Cloud Functions when changes are merged to `main` branch via GitHub Actions.

**Workflows:**
- `.github/workflows/api-ci.yml` - Runs linting, tests, and builds on PRs
- `.github/workflows/api-deploy.yml` - Deploys to GCF on merge to main

**Setup:**
1. Configure GitHub secrets (see [GitHub Actions Secrets](../../docs/GITHUB_ACTIONS_SECRETS.md))
2. Merge PR to `main` - deployment happens automatically
3. Monitor deployment in GitHub Actions tab

**Manual Trigger:**
You can manually deploy via GitHub Actions UI → **Deploy API to Google Cloud Functions** → **Run workflow**

### Manual Deployment

For manual deployment or local testing:

```bash
# Build the project
npm run build

# Deploy using gcloud CLI
gcloud functions deploy kulrs-api \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --allow-unauthenticated \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest" \
  --set-env-vars="NODE_ENV=production,FIREBASE_PROJECT_ID=your-project-id,CORS_ORIGIN=https://kulrs.com,LOG_LEVEL=info"
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Project Structure

```
apps/api/
├── src/
│   ├── __tests__/          # Unit tests
│   ├── config/             # Configuration (Firebase, Database)
│   ├── middleware/         # Express middleware (auth)
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── utils/              # Utilities (validation)
│   └── index.ts            # Main entry point
├── .env.example            # Environment variables template
├── .gitignore
├── .prettierrc
├── eslint.config.js
├── jest.config.js
├── package.json
├── README.md
└── tsconfig.json
```

## Security

### Authentication
All write endpoints require a valid Firebase ID token in the `Authorization` header:
```
Authorization: Bearer <firebase-id-token>
```

### Rate Limiting
Rate limiting is handled at the Google Cloud Functions level. You can configure:
- **Quotas**: Set maximum requests per user/IP in Cloud Console
- **API Gateway**: Add API Gateway with rate limiting policies for production
- **Application-level**: For additional protection, implement `express-rate-limit` middleware

Example with express-rate-limit:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/palettes', limiter, verifyFirebaseToken, palettesRouter);
```

### CORS
CORS is configured via the `CORS_ORIGIN` environment variable. In production, set this to your web app's domain.

### Secrets Management
Sensitive data is stored in Google Cloud Secret Manager:
- Database connection strings
- API keys
- Other credentials

Never commit secrets to the repository.

## Database

This API uses the `@kulrs/db` package which provides:
- Drizzle ORM schema
- Type-safe database queries
- Migrations

See `packages/db/README.md` for database setup and migrations.

## Read Strategy

The Kulrs architecture separates read and write operations:

- **Write API** (this app): Google Cloud Functions for mutations
- **Read API**: Direct database access from frontend (see `docs/READ_STRATEGY.md`)

This allows for:
- Better caching of read operations
- Simplified read queries without authentication overhead
- Optimized write path with proper validation and authorization

## Related Documentation

- [Firebase Setup Guide](../../docs/FIREBASE_SETUP.md)
- [Google Cloud Setup](../../docs/GOOGLE_CLOUD_SETUP.md)
- [Neon Database Setup](../../docs/NEON_SETUP.md)
- [Database ERD](../../docs/ERD.md)
- [Read Strategy Decision](../../docs/READ_STRATEGY.md)

## Troubleshooting

### "Cannot find module '@kulrs/db'"
Make sure you've built the `@kulrs/db` package:
```bash
cd ../../packages/db
npm run build
```

### Firebase Authentication Errors
- Ensure you're logged in: `gcloud auth application-default login`
- Check that `FIREBASE_PROJECT_ID` is set correctly
- Verify the ID token is valid and not expired

### Database Connection Errors
- Verify `DATABASE_URL` is set correctly
- Check network connectivity to Neon
- Ensure database exists and migrations are applied

## License

ISC
