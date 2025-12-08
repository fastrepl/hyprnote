import * as Sentry from "@sentry/bun";

const stt = {
  websocketConnected: (provider: string) => {
    Sentry.metrics.count("websocket.connected", 1, {
      attributes: { provider },
    });
  },
  websocketDisconnected: (provider: string, durationMs: number) => {
    Sentry.metrics.distribution("websocket.duration", durationMs, {
      unit: "millisecond",
      attributes: { provider },
    });
  },
};

export const Metrics = {
  ...stt,
  upstreamLatency: (provider: string, durationMs: number) => {
    Sentry.metrics.distribution("upstream.latency", durationMs, {
      unit: "millisecond",
      attributes: { provider },
    });
  },
  upstreamStreamDuration: (provider: string, durationMs: number) => {
    Sentry.metrics.distribution("upstream.stream_duration", durationMs, {
      unit: "millisecond",
      attributes: { provider },
    });
  },
};
