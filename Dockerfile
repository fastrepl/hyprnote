FROM node:20-slim AS web-base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM web-base AS web-builder
COPY . /app
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @hypr/web build

FROM rust:1.83.0 AS rust-builder
WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    cmake \
    build-essential \
    protobuf-compiler \
    libasound2-dev

COPY . .
RUN cargo build --release --package server

FROM debian:bookworm-slim AS runtime
WORKDIR /app
COPY --from=web-builder /app/apps/web/dist /app/apps/web/dist
COPY --from=rust-builder /app/target/release/server /usr/local/bin/server
ENTRYPOINT ["/usr/local/bin/server"]
