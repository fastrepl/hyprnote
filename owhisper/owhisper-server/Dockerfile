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
    curl \
    strace \
    procps \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/owhisper-server /usr/local/bin/owhisper-server

# Make sure the binary is executable
RUN chmod +x /usr/local/bin/owhisper-server

# Test the binary first as root
RUN /usr/local/bin/owhisper-server --help || echo "Binary test failed"

RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

RUN mkdir -p /app/models /app/config

ENV XDG_CACHE_HOME=/app/cache
ENV XDG_CONFIG_HOME=/app/config
ENV XDG_DATA_HOME=/app/data
ENV RUST_LOG=debug
ENV RUST_BACKTRACE=1

RUN mkdir -p /app/cache/com.fastrepl.owhisper

EXPOSE 8080

# Create a debug script
USER root
RUN echo '#!/bin/bash' > /debug.sh && \
    echo 'echo "=== Debug Info ===="' >> /debug.sh && \
    echo 'echo "User: $(whoami)"' >> /debug.sh && \
    echo 'echo "Working directory: $(pwd)"' >> /debug.sh && \
    echo 'echo "Binary exists: $(ls -la /usr/local/bin/owhisper-server)"' >> /debug.sh && \
    echo 'echo "Config file: $(ls -la /app/config/ 2>/dev/null || echo "No config dir")"' >> /debug.sh && \
    echo 'echo "Models dir: $(ls -la /app/models/ 2>/dev/null || echo "No models dir")"' >> /debug.sh && \
    echo 'echo "Environment:"' >> /debug.sh && \
    echo 'env | grep -E "(RUST_|XDG_|OWHISPER_)"' >> /debug.sh && \
    echo 'echo "=== Testing Binary ===="' >> /debug.sh && \
    echo '/usr/local/bin/owhisper-server --help 2>&1 || echo "Binary help failed"' >> /debug.sh && \
    echo 'echo "=== Starting Server ===="' >> /debug.sh && \
    echo 'exec "$@"' >> /debug.sh && \
    chmod +x /debug.sh

USER appuser

ENTRYPOINT ["/debug.sh", "/usr/local/bin/owhisper-server"]
CMD ["serve", "--config", "/app/config/config.json", "--port", "8080"]
