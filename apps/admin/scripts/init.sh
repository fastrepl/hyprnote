#!/bin/sh

echo "Running database migrations..."
npx drizzle-kit migrate

echo "Starting application..."
exec pnpm start