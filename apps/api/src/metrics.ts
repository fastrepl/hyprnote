import * as Sentry from "@sentry/bun";

const billing = {
  billingSync: (success: boolean, eventType: string) => {
    Sentry.metrics.count("billing.sync", 1, {
      attributes: { success: String(success), event_type: eventType },
    });
  },
};

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

const llm = {
  chatCompletion: (streaming: boolean, statusCode: number) => {
    Sentry.metrics.count("chat.completion", 1, {
      attributes: { streaming: String(streaming), status: String(statusCode) },
    });
  },
};

export const Metrics = {
  ...stt,
  ...llm,
  upstreamLatency: (provider: string, durationMs: number) => {
    Sentry.metrics.distribution("upstream.latency", durationMs, {
      unit: "millisecond",
      attributes: { provider },
    });
  },
  ...billing,
};
