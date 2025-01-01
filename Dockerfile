FROM rust:1.83.0 AS builder
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
COPY --from=builder /app/target/release/server /usr/local/bin/server
ENTRYPOINT ["/usr/local/bin/server"]
