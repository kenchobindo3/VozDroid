#!/usr/bin/env bash
# Root Gradle wrapper forwarding script for ZANNA AI Capacitor Android
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# 1. Ensure web app is built if dist does not exist
if [ ! -d "$DIR/dist" ]; then
  echo "==> Building web assets with Vite..."
  npm run build
fi

# 2. Ensure Capacitor sync is run
if [ ! -d "$DIR/android/app/src/main/assets/public" ]; then
  echo "==> Syncing Capacitor Android assets..."
  npx cap sync android
fi

# 3. Grant execute permission and run android/gradlew
chmod +x "$DIR/android/gradlew"
cd "$DIR/android"
exec ./gradlew "$@"
