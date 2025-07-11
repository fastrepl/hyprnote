FROM node:22-slim AS base
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
RUN pnpm rebuild

FROM base AS runtime
WORKDIR /app

RUN mkdir -p /app/data

COPY --from=build /app/apps/admin/.output ./.output
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/node_modules ./.output/server/node_modules
COPY --from=prod-deps /app/apps/admin/package.json ./package.json

COPY --from=build /app/apps/admin/src/lib/db/migrations ./src/lib/db/migrations
COPY --from=build /app/apps/admin/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/apps/admin/src/lib/db/schema ./src/lib/db/schema

ENV DATABASE_URL="file:/app/data/db.sqlite"
EXPOSE 8000

COPY apps/admin/scripts/init.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
