FROM node:22-slim AS node-base
WORKDIR /repo

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable

FROM node-base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/slack-internal/package.json apps/slack-internal/package.json
RUN pnpm fetch --filter @hypr/slack-internal

FROM deps AS build
COPY apps/slack-internal apps/slack-internal
RUN pnpm install --filter @hypr/slack-internal --frozen-lockfile
RUN pnpm deploy --filter @hypr/slack-internal --prod --legacy /runtime

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV="production"
COPY --from=build /runtime ./
CMD ["bun", "src/index.ts"]
