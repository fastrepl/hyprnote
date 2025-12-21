# syntax=docker/dockerfile:1

ARG RUST_VERSION=1.92.0

FROM rust:${RUST_VERSION}-bookworm AS planner
RUN cargo install cargo-chef --locked
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
RUN sed -i '/^members = \[/,/^\]/c\members = ["apps/ai", "crates/*"]' Cargo.toml
COPY crates crates
COPY apps/ai/Cargo.toml apps/ai/Cargo.toml
RUN mkdir -p apps/ai/src && echo "fn main() {}" > apps/ai/src/main.rs
RUN cargo chef prepare --recipe-path recipe.json

FROM rust:${RUST_VERSION}-bookworm AS build
RUN cargo install cargo-chef sccache --locked
ENV RUSTC_WRAPPER=sccache \
    SCCACHE_DIR=/sccache
WORKDIR /app
COPY --from=planner /app/recipe.json recipe.json
RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/usr/local/cargo/git,sharing=locked \
    --mount=type=cache,target=$SCCACHE_DIR,sharing=locked \
    cargo chef cook --release --recipe-path recipe.json -p ai
COPY Cargo.toml Cargo.lock ./
RUN sed -i '/^members = \[/,/^\]/c\members = ["apps/ai", "crates/*"]' Cargo.toml
COPY crates crates
COPY apps/ai apps/ai
RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/usr/local/cargo/git,sharing=locked \
    --mount=type=cache,target=$SCCACHE_DIR,sharing=locked \
    cargo build --release -p ai

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -d /nonexistent -s /usr/sbin/nologin -M appuser
COPY --from=build --chown=appuser:appgroup /app/target/release/ai /usr/local/bin/ai
USER appuser
WORKDIR /app
EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/ai"]
