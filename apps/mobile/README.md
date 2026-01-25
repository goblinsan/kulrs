# mobile

A Flutter mobile application for Kulrs.

## Getting Started

This project is a Flutter application.

### Prerequisites

- Flutter SDK (>= 3.0.0)

### Running the app

#### Development Mode

Use the provided script for local development:

```bash
./run-dev.sh
```

**Note**: If you get a "Permission denied" error, make the script executable first:
```bash
chmod +x run-dev.sh
```

Or run manually with environment variables:

```bash
flutter run \
  --dart-define=API_URL=http://localhost:8080 \
  --dart-define=APP_ENV=development \
  --dart-define=ENABLE_ANALYTICS=false
```

#### Production Mode

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
