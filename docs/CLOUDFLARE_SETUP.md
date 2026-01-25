# Cloudflare Pages Configuration Guide

This guide explains how to configure environment variables for Cloudflare Pages deployment.

## Overview

Cloudflare Pages allows you to set environment variables that will be available during the build process and in your deployed application.

## Accessing Cloudflare Pages Settings

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Select your **Pages project** (e.g., `kulrs-web`)
4. Go to **Settings** tab
5. Scroll down to **Environment Variables** section

## Environment Configuration

### Production Environment

Set these variables for the **Production** environment:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `VITE_API_URL` | `https://api.kulrs.com` | Production API URL |
| `VITE_APP_ENV` | `production` | Application environment |
| `VITE_ENABLE_DEBUG` | `false` | Disable debug features |

### Preview Environment

Set these variables for the **Preview** environment (for PR deployments):

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `VITE_API_URL` | `https://api-staging.kulrs.com` | Staging API URL |
| `VITE_APP_ENV` | `staging` | Application environment |
| `VITE_ENABLE_DEBUG` | `true` | Enable debug features |

## Build Configuration

### Build Settings

Configure in **Settings → Builds & deployments**:

```
Build command: npm run build
Build output directory: dist
Root directory: apps/web
```

### Framework Preset

Select **Vite** as the framework preset. This will automatically configure:
- Build command
- Output directory
- Environment variable handling

## Advanced Configuration

### Custom Build Command

If you need to build shared packages first:

```bash
cd ../.. && npm ci && cd packages/shared && npm run build && cd ../../apps/web && npm run build
```

### Environment-Specific Builds

Use different build commands per environment:

**Production:**
```bash
npm run build -- --mode production
```

**Preview:**
```bash
npm run build -- --mode staging
```

## wrangler.toml Configuration

For Cloudflare Workers (if using), create `wrangler.toml` in `apps/web/`:

```toml
name = "kulrs-web"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"

[env.production]
vars = { ENVIRONMENT = "production" }

[env.preview]
vars = { ENVIRONMENT = "preview" }
```

## Deployment Methods

### Method 1: Automatic Deployment via GitHub Integration

1. Connect your GitHub repository in Pages settings
2. Select branch for production (`main`)
3. Configure build settings as above
4. Every push to `main` triggers a production deployment
5. Every PR creates a preview deployment

### Method 2: Deploy via GitHub Actions

Use the Cloudflare Wrangler Action:

```yaml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: pages deploy dist --project-name=kulrs-web
```

### Method 3: Manual Deployment via Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Authenticate
wrangler login

# Deploy
wrangler pages deploy dist --project-name=kulrs-web
```

## Custom Domains

### Configure Custom Domain

1. Go to **Custom domains** tab
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `kulrs.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning

### DNS Configuration

Add these DNS records in Cloudflare:

```
Type: CNAME
Name: @ (or subdomain)
Target: kulrs-web.pages.dev
Proxy: Yes (orange cloud)
```

## Secrets Management

### Important Note

⚠️ **Never store secrets in Cloudflare Pages environment variables** if they will be exposed to the client-side application.

For client-side apps (like Vite/React):
- All `VITE_*` variables are embedded in the JavaScript bundle
- Anyone can view these values in browser DevTools
- Only use for public configuration

For sensitive operations:
- Use backend APIs
- Store secrets in Google Cloud Secret Manager
- Access secrets server-side only

## Monitoring and Logs

### Build Logs

View build logs in the Cloudflare Pages dashboard:
1. Go to your Pages project
2. Click on a deployment
3. View **Build log** tab

### Function Logs (if using Pages Functions)

Enable logging in your Functions:
```javascript
export async function onRequest(context) {
  console.log('Request received:', context.request.url);
  return new Response('Hello!');
}
```

Logs appear in **Real-time logs** in the dashboard.

## Troubleshooting

### Build Failures

**Issue**: Build fails with "command not found"
- Solution: Ensure build command is correct and dependencies are installed

**Issue**: Environment variables not available
- Solution: Verify variable names start with `VITE_` for Vite apps

**Issue**: Dependencies not found
- Solution: Check `package.json` is in the correct directory

### Deployment Issues

**Issue**: 404 on deployed site
- Solution: Verify `dist` directory contains `index.html`
- Solution: Check "Build output directory" setting

**Issue**: Old version deployed
- Solution: Clear Cloudflare cache
- Solution: Rebuild and redeploy

## Best Practices

1. **Use environment-specific variables** - Different values for production and preview
2. **Don't commit build artifacts** - Let Cloudflare build from source
3. **Test preview deployments** - Review PR preview before merging
4. **Monitor build times** - Optimize if builds take too long
5. **Use caching** - Enable Cloudflare caching for static assets
6. **Set up branch deployments** - Automatically deploy from specific branches

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Pages Build Configuration](https://developers.cloudflare.com/pages/platform/build-configuration/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)
