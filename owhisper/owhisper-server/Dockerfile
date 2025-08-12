FROM rust:1 AS chef
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libasound2-dev \
    clang \
    cmake \
    && rm -rf /var/lib/apt/lists/*
RUN cargo install cargo-chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json --bin owhisper-server

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
COPY . .
RUN cargo chef cook --release --recipe-path recipe.json

RUN cargo build --release --bin owhisper-server

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/owhisper-server /usr/local/bin/owhisper-server

RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

RUN mkdir -p /app/models /app/config

ENV XDG_CACHE_HOME=/app/cache
ENV XDG_CONFIG_HOME=/app/config
ENV XDG_DATA_HOME=/app/data

RUN mkdir -p /app/cache/com.fastrepl.owhisper

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/owhisper-server"]
CMD ["serve", "--config", "/app/config/config.json", "--port", "8080"]
