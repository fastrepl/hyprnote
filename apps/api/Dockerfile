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
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/supabase/package.json packages/supabase/package.json
RUN pnpm fetch --prod --filter @hypr/api

FROM deps AS build
COPY apps/api apps/api
COPY packages/api-client packages/api-client
COPY packages/supabase packages/supabase
RUN pnpm install --filter @hypr/api --frozen-lockfile
RUN pnpm deploy --filter @hypr/api --prod --legacy /runtime

FROM oven/bun:1 AS runtime
WORKDIR /app

# https://github.com/aptible/supercronic/releases
ENV SUPERCRONIC_URL=https://github.com/aptible/supercronic/releases/download/v0.2.33/supercronic-linux-amd64 \
    SUPERCRONIC=supercronic-linux-amd64 \
    SUPERCRONIC_SHA1SUM=71b0d58cc53f6bd72cf2f293e09e294b79c666d8

RUN apt-get update && apt-get install -y curl && \
    curl -fsSLO "$SUPERCRONIC_URL" && \
    echo "${SUPERCRONIC_SHA1SUM}  ${SUPERCRONIC}" | sha1sum -c - && \
    chmod +x "$SUPERCRONIC" && \
    mv "$SUPERCRONIC" "/usr/local/bin/${SUPERCRONIC}" && \
    ln -s "/usr/local/bin/${SUPERCRONIC}" /usr/local/bin/supercronic && \
    apt-get remove -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

COPY --from=build /runtime ./
COPY apps/api/crontab /app/crontab

EXPOSE 8787
CMD ["bun", "src/index.ts"]
