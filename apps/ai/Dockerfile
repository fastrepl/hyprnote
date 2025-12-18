ARG RUST_VERSION=1.92.0
FROM rust:${RUST_VERSION}-bookworm AS builder

WORKDIR /build
COPY . .

RUN cargo build --release --locked -p ai && \
    mkdir -p /runtime/usr/local/bin && \
    mv ./target/release/ai /runtime/usr/local/bin

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
RUN useradd -u 10001 -d /nonexistent -s /usr/sbin/nologin -M -c "" appuser && \
    passwd -l appuser
COPY --from=builder --chown=appuser:appuser /runtime /
USER appuser
WORKDIR /app
EXPOSE 3000
CMD ["/usr/local/bin/ai"]
