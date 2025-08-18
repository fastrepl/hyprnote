# https://hono.dev/docs/getting-started/nodejs#building-deployment
# https://pnpm.io/docker#example-2-build-multiple-docker-images-in-a-monorepo

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY admin/server /app/admin/server
COPY pnpm-lock.yaml /app/pnpm-lock.yaml
COPY pnpm-workspace.yaml /app/pnpm-workspace.yaml
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm -F @hypr/admin-server run build

FROM base AS runtime
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

COPY --from=prod-deps --chown=hono:nodejs /app/node_modules /app/node_modules
COPY --from=build --chown=hono:nodejs /app/admin/server/dist /app/dist
COPY --chown=hono:nodejs admin/server/package.json /app/package.json

USER hono
EXPOSE 3000
CMD ["node", "/app/dist/index.js"]
