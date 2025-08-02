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
RUN cd owhisper/owhisper-server && cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/owhisper/owhisper-server/recipe.json owhisper/owhisper-server/recipe.json
COPY . .
RUN cd owhisper/owhisper-server && cargo chef cook --release --recipe-path recipe.json

RUN cargo build --release --bin owhisper-server

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/owhisper-server /usr/local/bin/owhisper-server

RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

RUN mkdir -p /app/config /app/models

EXPOSE 8080

ENV CONFIG_PATH=/app/config/config.yaml
ENV PORT=8080

ENTRYPOINT ["/usr/local/bin/owhisper-server"]
CMD ["serve", "--config-path", "${CONFIG_PATH}", "--port", "${PORT}"]
