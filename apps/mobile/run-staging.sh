#!/bin/bash
# Staging environment run script for Flutter mobile app
# This script runs the app with staging environment variables

set -e  # Exit on error

flutter run \
  --dart-define=API_URL=https://api-staging.kulrs.com \
  --dart-define=APP_ENV=staging \
  --dart-define=ENABLE_ANALYTICS=true
