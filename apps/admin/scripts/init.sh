#!/bin/bash
set -e

echo "Installing migration dependencies..."
cd /app/scripts
pnpm config set store-dir ~/.pnpm-store
pnpm install --prod
echo "Rebuilding native dependencies for target architecture..."
pnpm rebuild
cd /app

echo "Running database migrations..."
cd /app
/app/scripts/node_modules/.bin/drizzle-kit migrate

echo "Starting server..."
exec node .output/server/index.mjs