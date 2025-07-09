FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS prod
COPY pnpm-lock.yaml /app/
COPY pnpm-workspace.yaml /app/
COPY package.json /app/
WORKDIR /app

RUN pnpm fetch --prod

COPY . /app
RUN pnpm install --frozen-lockfile --prod
RUN pnpm --filter="@hypr/admin" run build

FROM base
COPY --from=prod /app/apps/admin/.output /app/.output
COPY --from=prod /app/apps/admin/package.json /app/package.json
COPY --from=prod /app/node_modules /app/node_modules
WORKDIR /app
EXPOSE 8000
CMD ["pnpm", "start"]
