# https://pnpm.io/docker#example-3-build-on-cicd
FROM node:22-slim AS node-base
WORKDIR /repo

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable

FROM node-base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/bot/package.json apps/bot/package.json
RUN pnpm fetch --filter @hypr/bot

FROM deps AS build
COPY apps/bot apps/bot
RUN pnpm install --filter @hypr/bot --frozen-lockfile
RUN pnpm --filter @hypr/bot run build
RUN pnpm deploy --filter @hypr/bot --prod --legacy /runtime

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV="production"
COPY --from=build /runtime ./
COPY --from=build /repo/apps/bot/lib/src ./lib
CMD ["node", "./lib/server.js"]
