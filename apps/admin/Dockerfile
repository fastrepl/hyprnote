FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

RUN corepack enable

FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter="@hypr/admin" run build

FROM base AS runtime
WORKDIR /app

RUN mkdir -p /app/data

COPY --from=build /app/apps/admin/.output ./.output

RUN cd ./.output/server && pnpm rebuild

COPY --from=build /app/apps/admin/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/apps/admin/src/lib/db/migrations/ ./src/lib/db/migrations/
COPY --from=build /app/apps/admin/src/lib/db/schema/ ./src/lib/db/schema/

RUN mkdir -p /app/scripts
COPY apps/admin/scripts/package.json /app/scripts/package.json

ENV DATABASE_URL="file:/app/data/db.sqlite"
EXPOSE 8000

COPY apps/admin/scripts/init.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
