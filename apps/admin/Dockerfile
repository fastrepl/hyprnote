FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter="@hypr/admin" run auth:migrate
RUN pnpm --filter="@hypr/admin" run build

FROM base AS prod-deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch --prod
COPY . .
RUN pnpm install --frozen-lockfile --prod

FROM base AS runtime
WORKDIR /app

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Copy application files
COPY --from=build /app/apps/admin/.output ./.output
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/admin/package.json ./package.json

# Copy migration scripts and schema for runtime migrations
COPY --from=build /app/apps/admin/drizzle ./drizzle
COPY --from=build /app/apps/admin/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/apps/admin/src/utils/auth-schema.ts ./src/utils/auth-schema.ts

# Set environment variable for database location
ENV DATABASE_URL="file:/app/data/db.sqlite"

EXPOSE 8000

# Create startup script that runs migrations then starts the app
RUN echo '#!/bin/sh\necho "Running database migrations..."\nnpx drizzle-kit migrate\necho "Starting application..."\nexec pnpm start' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
