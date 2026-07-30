#!/bin/sh

# Xcode Cloud Post-Clone Script
# Runs after the repository is cloned

set -e

echo "=== Xcode Cloud Post-Clone Script ==="
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"
echo "Working directory: $(pwd)"

# CI_PRIMARY_REPOSITORY_PATH is the repo root in Xcode Cloud
REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH}"

# Fallback: script lives at ios/ci_scripts/, repo root is two levels up
if [ -z "$REPO_ROOT" ]; then
  REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fi

echo "Repo root: $REPO_ROOT"

# Install Node.js if missing
if ! command -v node &>/dev/null; then
  echo "Installing Node.js via Homebrew..."
  brew install node
fi

echo "Node version: $(node --version)"
echo "NPM version:  $(npm --version)"

# Install JavaScript dependencies
echo "Installing JS dependencies in: $REPO_ROOT"
cd "$REPO_ROOT"
npm install --legacy-peer-deps

# Install CocoaPods dependencies
IOS_DIR="$REPO_ROOT/ios"
echo "Running pod install in: $IOS_DIR"
cd "$IOS_DIR"

if [ -f "Gemfile" ]; then
  bundle install
  bundle exec pod install --repo-update
else
  pod install --repo-update
fi

echo "=== Post-Clone complete ==="
