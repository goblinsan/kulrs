#!/bin/bash
# Local development run script for Flutter mobile app
# This script runs the app with development environment variables

set -e  # Exit on error

flutter run \
  --dart-define=API_URL=http://localhost:8080 \
  --dart-define=APP_ENV=development \
  --dart-define=ENABLE_ANALYTICS=false
