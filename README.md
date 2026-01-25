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

#### Mobile Application

```bash
cd apps/mobile
flutter run        # Run app
flutter analyze    # Run analyzer
flutter test       # Run tests
```

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

## License

ISC

