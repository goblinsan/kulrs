# Firebase Setup Guide

This document provides step-by-step instructions for setting up Firebase Authentication for the Kulrs project.

## Prerequisites

- Google account
- Access to [Firebase Console](https://console.firebase.google.com/)
- Admin access to the Kulrs repository

## Part 1: Create Firebase Project

### Step 1: Create a New Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** (or **Create a project**)
3. Enter project details:
   - **Project name**: `kulrs` (or your preferred name)
   - **Project ID**: Note this down - it will be used in configurations
4. **Google Analytics**: Enable or disable as preferred
5. Click **Create project**
6. Wait for project creation to complete

### Step 2: Enable Authentication

1. In the Firebase Console, select your project
2. Navigate to **Build → Authentication**
3. Click **Get started**
4. Enable sign-in methods:
   - **Email/Password**: 
     - Click on Email/Password provider
     - Toggle **Enable**
     - Click **Save**
   - **Google**: 
     - Click on Google provider
     - Toggle **Enable**
     - Configure support email
     - Click **Save**

## Part 2: Register Web Application

### Step 1: Add Web App

1. In Firebase Console, go to **Project Overview**
2. Click the **Web** icon (`</>`) to add a web app
3. Register app:
   - **App nickname**: `kulrs-web`
   - **Firebase Hosting**: Leave unchecked (we use Cloudflare Pages)
4. Click **Register app**
5. **Copy the Firebase configuration** - you'll need these values:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "kulrs-xxxxx.firebaseapp.com",
     projectId: "kulrs-xxxxx",
     storageBucket: "kulrs-xxxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef123456"
   };
   ```
6. Click **Continue to console**

### Step 2: Configure Web App Environment Variables

Add these variables to your web app configuration:

#### Local Development (`.env.local`)

Create `apps/web/.env.local`:
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=kulrs-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kulrs-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=kulrs-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Existing variables
VITE_API_URL=http://localhost:8080
VITE_APP_ENV=development
VITE_ENABLE_DEBUG=true
```

#### Production (Cloudflare Pages)

Add these environment variables in Cloudflare Pages dashboard:
- **Settings → Environment Variables → Production**
- Add each `VITE_FIREBASE_*` variable with production values

## Part 3: Register Mobile Applications

### iOS App Registration

1. In Firebase Console, click **Add app** → **iOS**
2. Register iOS app:
   - **iOS bundle ID**: `com.kulrs.mobile` (or your bundle ID)
   - **App nickname**: `kulrs-ios`
   - **App Store ID**: (optional, add later)
3. Click **Register app**
4. **Download GoogleService-Info.plist**
5. Click **Continue** through the remaining steps
6. **Important**: Add `GoogleService-Info.plist` to your iOS project (but NOT to version control)

### Android App Registration

1. In Firebase Console, click **Add app** → **Android**
2. Register Android app:
   - **Android package name**: `com.kulrs.mobile` (or your package name)
   - **App nickname**: `kulrs-android`
   - **Debug signing certificate SHA-1**: (optional for development)
3. Click **Register app**
4. **Download google-services.json**
5. Click **Continue** through the remaining steps
6. **Important**: Add `google-services.json` to your Android project (but NOT to version control)

### Step 3: Configure Mobile App Environment Variables

For Flutter, Firebase config files are used directly (`GoogleService-Info.plist` and `google-services.json`), but you still need to configure the app:

#### Development Script (`apps/mobile/run-dev.sh`)

```bash
#!/bin/bash
flutter run \
  --dart-define=API_URL=http://localhost:8080 \
  --dart-define=APP_ENV=development \
  --dart-define=ENABLE_ANALYTICS=false
```

#### Production Build

Configure via CI/CD or build scripts with production API URLs.

## Part 4: Security Configuration

### Enable App Check (Recommended)

1. In Firebase Console, go to **Build → App Check**
2. Click **Get started**
3. Register each app:
   - **Web**: Use reCAPTCHA v3
   - **iOS**: Use DeviceCheck or App Attest
   - **Android**: Use Play Integrity API

### Configure Authorized Domains

1. Go to **Authentication → Settings → Authorized domains**
2. Add your domains:
   - For development: `localhost`
   - For production: `kulrs.com`, `www.kulrs.com`
   - For Cloudflare Pages preview: `*.pages.dev`

### Set Password Policy (Optional)

1. Go to **Authentication → Settings → Password policy**
2. Configure password requirements as needed

## Part 5: Environment Variables Reference

### Web Application

All Firebase config variables must be prefixed with `VITE_`:

| Variable Name | Description | Required |
|--------------|-------------|----------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | Yes |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID | Yes |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | Yes |

### Mobile Application

Flutter uses config files instead of environment variables:
- **iOS**: `ios/Runner/GoogleService-Info.plist`
- **Android**: `android/app/google-services.json`

**IMPORTANT**: These files contain sensitive app identifiers and should NOT be committed to version control. Add them to `.gitignore`.

## Part 6: Verify Setup

### Test Authentication

1. **Web App**:
   - Run `cd apps/web && npm run dev`
   - Try signing up with email/password
   - Try signing in with Google
   - Check Firebase Console → Authentication → Users to see new users

2. **Mobile App**:
   - Run `cd apps/mobile && flutter run`
   - Try the same authentication flows
   - Verify users appear in Firebase Console

### Monitor Usage

1. Go to **Authentication → Usage** to monitor:
   - Sign-ups
   - Sign-ins
   - Active users
2. Set up quota alerts if needed

## Security Best Practices

1. **Never commit Firebase config files** to version control:
   - `GoogleService-Info.plist`
   - `google-services.json`
   - `.env.local`

2. **Use Firebase App Check** in production to prevent abuse

3. **Restrict API keys** in Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to **APIs & Services → Credentials**
   - Edit API key restrictions

4. **Enable email verification** for better security:
   - Go to **Authentication → Templates**
   - Customize email verification templates

5. **Monitor authentication activity** regularly

6. **Rotate credentials** periodically

## Troubleshooting

### Web: Firebase not initializing

- Verify all `VITE_FIREBASE_*` variables are set
- Check browser console for errors
- Ensure variables start with `VITE_` prefix

### Mobile: Firebase not connecting

- Verify config files are in correct locations
- Check bundle ID / package name matches Firebase console
- Ensure Firebase dependencies are properly installed

### Authentication: Unauthorized domain error

- Add your domain to **Authentication → Settings → Authorized domains**
- For local dev, ensure `localhost` is authorized

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [FlutterFire Documentation](https://firebase.flutter.dev/)
- [Firebase Web SDK](https://firebase.google.com/docs/web/setup)

## Next Steps

After completing this setup:
1. Update `.env.example` in `apps/web/` with Firebase variable templates
2. Add Firebase configuration code to web and mobile apps
3. Implement authentication flows
4. Test thoroughly in all environments
