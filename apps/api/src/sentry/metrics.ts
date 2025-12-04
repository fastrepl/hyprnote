import * as Sentry from "@sentry/bun";

export const Metrics = {
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

  billingSync: (success: boolean, eventType: string) => {
    Sentry.metrics.count("billing.sync", 1, {
      attributes: { success: String(success), event_type: eventType },
    });
  },

  chatCompletion: (streaming: boolean, statusCode: number) => {
    Sentry.metrics.count("chat.completion", 1, {
      attributes: { streaming: String(streaming), status: String(statusCode) },
    });
  },

  upstreamLatency: (provider: string, durationMs: number) => {
    Sentry.metrics.distribution("upstream.latency", durationMs, {
      unit: "millisecond",
      attributes: { provider },
    });
  },
};
