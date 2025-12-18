FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY bin/ai /app/ai

EXPOSE 3000
CMD ["/app/ai"]
