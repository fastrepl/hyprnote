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
COPY --from=build /app/apps/admin/.output ./.output
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/admin/package.json ./package.json
EXPOSE 8000
CMD ["pnpm", "start"]
