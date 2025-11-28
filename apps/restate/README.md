# @hypr/restate

Restate service for audio transcription pipeline with Deepgram and LLM integration.

## Local Development

### Prerequisites

- [Restate Server](https://docs.restate.dev/develop/local_dev) running locally
- Node.js 22+
- pnpm

### Setup

```bash
pnpm install
```

### Running locally

Start the Cloudflare Workers dev server:

```bash
pnpm dev
```

Register the service with Restate:

```bash
npx @restatedev/restate deployments register --use-http1.1 http://localhost:9080
```

### Environment Variables

Configure these in your Cloudflare Workers environment:

- `RESTATE_INGRESS_URL` - Restate ingress URL for callbacks
- `DEEPGRAM_API_KEY` - Deepgram API key for transcription
- `LLM_API_URL` - LLM API endpoint URL
- `LLM_API_KEY` - LLM API key (optional)
