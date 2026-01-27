# kulrs

A mono-repo for the Kulrs application suite.

## Project Structure

- **apps/web** - React + Vite web application
- **apps/mobile** - Flutter mobile application
- **packages/shared** - Shared types and utilities
- **docs/** - Project documentation

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Flutter SDK (for mobile development)
- Firebase project (see [Firebase Setup Guide](docs/FIREBASE_SETUP.md))

### Firebase Setup

This project uses Firebase for authentication. Before running the apps locally, you need to:

1. Create a Firebase project (if not already done)
2. Register web and mobile apps in Firebase Console
3. Configure environment variables and config files

See the [Firebase Setup Guide](docs/FIREBASE_SETUP.md) for detailed step-by-step instructions.

### Installation

```bash
# Install root dependencies (husky, commitlint)
npm install

# Install web app dependencies
cd apps/web && npm install

# Install shared package dependencies
cd packages/shared && npm install

# Get Flutter dependencies
cd apps/mobile && flutter pub get
```

### Development

#### Web Application

```bash
cd apps/web
npm run dev        # Start dev server
npm run lint       # Run linting
npm run format     # Format code
npm run build      # Build for production
```

**Environment Variables**: Copy `.env.example` to `.env.local` and configure for local development. See [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) for details.

#### Mobile Application

```bash
cd apps/mobile
./run-dev.sh       # Run with dev environment
flutter analyze    # Run analyzer
flutter test       # Run tests
```

**Environment Variables**: Use `--dart-define` flags or the provided `run-dev.sh` script. See [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) for details.

#### Shared Package

```bash
cd packages/shared
npm run build      # Build shared package
```

## Code Standards

- **Web**: ESLint + Prettier configured
- **Mobile**: Flutter analyzer + format
- **Commits**: Conventional commits enforced via commitlint
- **Git Hooks**: Husky for pre-commit and commit-msg hooks

## CI/CD

GitHub Actions workflows run on PRs:

- **Web CI**: Lint, build web app and shared package
- **Flutter CI**: Analyze and test mobile app

See [docs/GITHUB_ACTIONS_SECRETS.md](docs/GITHUB_ACTIONS_SECRETS.md) for secrets configuration.

## Environments & Secrets

This project uses environment variables and secrets for configuration across different deployment platforms:

- **[Firebase Setup Guide](docs/FIREBASE_SETUP.md)** - Step-by-step Firebase project setup and configuration
- **[Environment Variables Strategy](docs/ENVIRONMENTS.md)** - Complete guide to environment variables, naming conventions, and local development
- **[GitHub Actions Secrets](docs/GITHUB_ACTIONS_SECRETS.md)** - How to configure secrets for CI/CD pipelines
- **[Cloudflare Setup](docs/CLOUDFLARE_SETUP.md)** - Configuration for Cloudflare Pages deployment
- **[Google Cloud Setup](docs/GOOGLE_CLOUD_SETUP.md)** - Secret Manager and Cloud Functions configuration

## License

ISC

