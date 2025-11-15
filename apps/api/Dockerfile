# https://pnpm.io/docker#example-3-build-on-cicd
FROM node:22-slim AS node-base
WORKDIR /repo

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable

FROM node-base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm fetch --prod --filter @hypr/api

FROM deps AS build
COPY apps/api apps/api
RUN pnpm install --filter @hypr/api --frozen-lockfile
RUN pnpm deploy --filter @hypr/api --prod --legacy /runtime

FROM oven/bun:1 AS runtime
WORKDIR /app
COPY --from=build /runtime ./
EXPOSE 8787
CMD ["bun", "src/index.ts"]
