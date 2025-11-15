# Why: pnpm's Docker recipe recommends a Node + Corepack builder image so installs stay fast and cached (https://pnpm.io/docker)
FROM node:22-slim AS node-base
WORKDIR /repo

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable

# Why: pnpm's Docker recipe suggests copying only workspace metadata first so dependency layers stay cached (https://pnpm.io/docker)
FROM node-base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm fetch --prod --filter @hypr/api

# Why: after fetch, we still allow pnpm to download any missing tarballs instead of failing in offline mode
FROM deps AS build
COPY apps/api apps/api
RUN pnpm install --filter @hypr/api --frozen-lockfile
RUN pnpm --filter @hypr/api run typecheck
# Why: pnpm deploy creates a pruned copy of the service with only production deps, per pnpm issue #3114 guidance for workspace images (https://github.com/pnpm/pnpm/issues/3114)
# Why: workspace does not use injectWorkspacePackages, so we stick to pnpm's legacy deploy mode (https://pnpm.io/docker#example-2-build-multiple-docker-images-in-a-monorepo)
RUN pnpm deploy --filter @hypr/api --prod --legacy /runtime

# Why: Bun only needs to be present in the final runtime image per Bun's Docker guidance (https://bun.com/docs/guides/ecosystem/docker)
FROM oven/bun:1 AS runtime
WORKDIR /app
COPY --from=build /runtime ./
EXPOSE 8787
CMD ["bun", "src/index.ts"]
