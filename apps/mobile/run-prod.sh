#!/bin/bash
# Production environment run script for Flutter mobile app
# This script runs the app with production environment variables

set -e  # Exit on error

flutter run \
  --dart-define=API_URL=https://api.kulrs.com \
  --dart-define=APP_ENV=production \
  --dart-define=ENABLE_ANALYTICS=true
