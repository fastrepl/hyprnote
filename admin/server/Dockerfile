# https://hono.dev/docs/getting-started/nodejs#building-deployment
# https://pnpm.io/docker#example-2-build-multiple-docker-images-in-a-monorepo

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM base AS runtime
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

COPY --from=prod-deps --chown=hono:nodejs /app/node_modules /app/node_modules
COPY --from=build --chown=hono:nodejs /app/dist /app/dist
COPY --chown=hono:nodejs package.json /app/package.json

USER hono
EXPOSE 3000
CMD ["node", "/app/dist/index.js"]
