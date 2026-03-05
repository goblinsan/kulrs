# mobile

A Flutter mobile application for Kulrs.

## Getting Started

This project is a Flutter application.

### Prerequisites

- Flutter SDK (>= 3.0.0)
- Firebase project configured (see [Firebase Setup Guide](../../docs/FIREBASE_SETUP.md))

### Firebase Setup

Before running the app, you need to add Firebase configuration files:

1. **iOS**: Add `GoogleService-Info.plist` to `ios/Runner/`
2. **Android**: Add `google-services.json` to `android/app/`

These files are obtained from the Firebase Console when you register your mobile apps. See the [Firebase Setup Guide](../../docs/FIREBASE_SETUP.md) for detailed instructions.

**Important**: These files are gitignored and must be added manually in each development environment.

### Running the app

#### Development Mode

Use the provided script for local development:

```bash
./run-dev.sh
```

#### Staging Mode

Use the provided script for staging environment:

```bash
./run-staging.sh
```

#### Production Mode

Use the provided script for production environment:

```bash
./run-prod.sh
```

**Note**: If you get a "Permission denied" error, make the script executable first:
```bash
chmod +x run-dev.sh run-staging.sh run-prod.sh
```

Or run manually with environment variables:

**Development:**
```bash
flutter run \
  --dart-define=API_URL=http://localhost:8080 \
  --dart-define=APP_ENV=development \
  --dart-define=ENABLE_ANALYTICS=false
```

**Staging:**
```bash
flutter run \
  --dart-define=API_URL=https://api-staging.kulrs.com \
  --dart-define=APP_ENV=staging \
  --dart-define=ENABLE_ANALYTICS=true
```

**Production:**
```bash
flutter run \
  --dart-define=API_URL=https://api.kulrs.com \
  --dart-define=APP_ENV=production \
  --dart-define=ENABLE_ANALYTICS=true
```

### Environment Variables

The app supports the following build-time environment variables via `--dart-define`:

- `API_URL`: Backend API base URL (required)
- `APP_ENV`: Application environment (development, staging, production)
- `ENABLE_ANALYTICS`: Enable analytics tracking (true, false)

See [docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md) for more details.

### Testing

```bash
flutter test
```

### Linting

```bash
flutter analyze
```

## Application Structure

### Screens

- **Auth Screens** (`lib/screens/auth/`)
  - `login_screen.dart` - User login with email/password, Google, and Apple sign-in
  - `signup_screen.dart` - User registration with email/password, Google, and Apple sign-in

- **Generate Screen** (`lib/screens/generate/`)
  - `generate_screen.dart` - Main screen for generating color palettes
    - Generate from mood/description text
    - Generate from images (camera or gallery)
    - Integrated with palette generation API

- **Detail Screen** (`lib/screens/detail/`)
  - `detail_screen.dart` - Display detailed information about a color palette
    - Color swatches with hex values
    - Copy-to-clipboard functionality
    - Save, like, and remix actions

- **Saved Screen** (`lib/screens/saved/`)
  - `saved_screen.dart` - Browse and manage saved color palettes
    - Fetch user's saved palettes from API
    - Color preview thumbnails
    - Pull-to-refresh support

- **Home Screen** (`lib/screens/`)
  - `home_screen.dart` - Legacy home screen (kept for backward compatibility)

### Components

Reusable UI components are located in `lib/components/`:

- `loading_indicator.dart` - Customizable loading spinner
- `error_message.dart` - Error display with optional retry button
- `custom_app_bar.dart` - Consistent app bar across screens
- `custom_button.dart` - Reusable button with loading and enabled states
- `custom_card.dart` - Customizable card widget with tap support
- `components.dart` - Barrel file exporting all components

### Models

Data models are located in `lib/models/`:

- `palette.dart` - Palette, PaletteColor, and OKLCHColor models
- `models.dart` - Barrel file exporting all models

### Services

- `auth_service.dart` - Firebase authentication service with email/password, Google, and Apple sign-in
- `api_service.dart` - Backend API service for palette operations
  - Generate palettes (mood, color, image)
  - Save, like, unlike, remix palettes
  - Fetch user palettes and browse public palettes

### Providers

- `auth_provider.dart` - State management for authentication using Provider pattern

### Configuration

- `env.dart` - Environment configuration with support for development, staging, and production

## Navigation

The app uses named routes for navigation:

- `/login` - Login screen
- `/signup` - Signup screen
- `/home` - Legacy home screen
- `/generate` - Generate color palettes (default authenticated screen)
- `/detail` - View palette details (accepts `Palette` object or `paletteId` string)
- `/saved` - Browse saved palettes

## Environment Flavors

The app supports three environment flavors:

- **Development**: Local development with debug features
- **Staging**: Pre-production testing environment
- **Production**: Production environment

Use the appropriate run script (`run-dev.sh`, `run-staging.sh`, `run-prod.sh`) or pass `--dart-define` flags manually.

## Features

### Palette Generation

Generate color palettes in multiple ways:

1. **From Mood**: Enter a mood or description (e.g., "sunset", "ocean breeze") to generate a palette
2. **From Image**: Take a photo or choose from gallery to extract colors
3. **From Base Color**: Generate harmonious palettes from a base color (API support)

### Palette Management

- **Save**: Save generated palettes to your collection
- **Like**: Like palettes to show appreciation
- **Remix**: Create variations of existing palettes
- **Copy Hex**: Tap any color to copy its hex value to clipboard

### Browse & Search

- View all your saved palettes
- Browse public palettes (API integration)
- Pull-to-refresh to get latest palettes
