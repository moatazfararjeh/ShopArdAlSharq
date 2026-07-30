#!/bin/sh

# Xcode Cloud Post-Clone Script
# Runs after the repository is cloned — installs Node.js deps and CocoaPods

set -e

echo "=== Xcode Cloud Post-Clone Script ==="
echo "Working directory: $(pwd)"
echo "CI_WORKSPACE: $CI_WORKSPACE"

# ── Install Homebrew if missing ────────────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  echo "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# ── Install Node.js if missing ─────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "Installing Node.js via Homebrew..."
  brew install node
fi

echo "Node version: $(node --version)"
echo "NPM version:  $(npm --version)"

# ── Install JavaScript dependencies ───────────────────────────────────────────
# Move to repo root (one level up from ios/)
cd "$CI_WORKSPACE/.."
echo "Installing JS dependencies in: $(pwd)"
npm install

# ── Install CocoaPods dependencies ────────────────────────────────────────────
cd "$CI_WORKSPACE"
echo "Running pod install in: $(pwd)"

# Use Bundler if Gemfile exists, otherwise use system gem
if [ -f "Gemfile" ]; then
  echo "Using Bundler..."
  bundle install
  bundle exec pod install --repo-update
else
  echo "Using system CocoaPods..."
  gem install cocoapods --no-document 2>/dev/null || true
  pod install --repo-update
fi

echo "=== Post-Clone complete ==="
