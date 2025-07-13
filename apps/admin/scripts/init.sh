#!/bin/sh

echo "Running database migrations..."
npx drizzle-kit migrate

echo "Starting application..."
if command -v pnpm > /dev/null; then
    exec pnpm start
else
    exec npm start
fi