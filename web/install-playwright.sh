#!/bin/bash

# Playwright Browser Installation Script
# This script installs Playwright browsers with system dependencies
# Run this manually outside the sandbox environment

set -e

echo "=== Playwright Browser Installation ==="
echo ""
echo "Working directory: $(pwd)"
echo ""

# Check if we're in the web directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from the ./web directory"
    exit 1
fi

# Step 1: Install npm dependencies (if not already installed)
if [ ! -d "node_modules" ]; then
    echo "Step 1: Installing npm dependencies..."
    npm install
    echo "✓ npm dependencies installed"
else
    echo "Step 1: node_modules exists, skipping npm install"
fi

echo ""

# Step 2: Install Playwright browsers with system dependencies
echo "Step 2: Installing Playwright browsers with system dependencies..."
echo "Command: npx playwright install --with-deps chromium"
echo ""
npx playwright install --with-deps chromium

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Verification:"
echo "1. Check Playwright version: npx playwright --version"
echo "2. List installed browsers: npx playwright install --dry-run"
echo "3. Run E2E tests: npm run test:e2e"
echo ""
