import * as Sentry from "@sentry/bun";

import { posthog } from "../integration/posthog";
import type { ObservabilityEvent } from "./types";

export function handlePosthog(event: ObservabilityEvent): void {
  if (!event.userId) return;

  switch (event.type) {
    case "llm.request.success":
      posthog.capture({
        distinctId: event.userId,
        event: "llm_completion",
        properties: {
          model: event.model,
          duration_ms: event.durationMs,
          input_tokens: event.tokens?.input,
          output_tokens: event.tokens?.output,
        },
      });
      break;

    case "llm.stream.complete":
      posthog.capture({
        distinctId: event.userId,
        event: "llm_stream_completion",
        properties: {
          model: event.model,
          stream_duration_ms: event.durationMs,
        },
      });
      break;

    case "stt.batch.success":
      posthog.capture({
        distinctId: event.userId,
        event: "stt_transcription",
        properties: {
          provider: event.provider,
          duration_ms: event.durationMs,
        },
      });
      break;

    case "stt.websocket.disconnected":
      posthog.capture({
        distinctId: event.userId,
        event: "stt_realtime_session",
        properties: {
          provider: event.provider,
          session_duration_ms: event.durationMs,
        },
      });
      break;

    case "llm.request.error":
    case "stt.batch.error":
    case "stt.websocket.connected":
    case "stt.websocket.error":
      break;

    default:
      event satisfies never;
  }
}

export function handleSentry(event: ObservabilityEvent): void {
  switch (event.type) {
    case "llm.request.success":
      Sentry.metrics.distribution("upstream.latency", event.durationMs, {
        unit: "millisecond",
        attributes: { model: event.model, operation: "llm" },
      });
      break;

    case "llm.stream.complete":
      Sentry.metrics.distribution(
        "upstream.stream_duration",
        event.durationMs,
        {
          unit: "millisecond",
          attributes: { model: event.model },
        },
      );
      break;

    case "llm.request.error":
      Sentry.captureException(event.error, {
        user: event.userId ? { id: event.userId } : undefined,
        tags: { model: event.model, operation: "llm" },
      });
      Sentry.metrics.distribution("upstream.latency", event.durationMs, {
        unit: "millisecond",
        attributes: { model: event.model, operation: "llm", status: "error" },
      });
      break;

    case "stt.batch.success":
      Sentry.metrics.distribution("upstream.latency", event.durationMs, {
        unit: "millisecond",
        attributes: { provider: event.provider, operation: "stt_batch" },
      });
      break;

    case "stt.batch.error":
      Sentry.captureException(event.error, {
        user: event.userId ? { id: event.userId } : undefined,
        tags: { provider: event.provider, operation: "stt_batch" },
      });
      Sentry.metrics.distribution("upstream.latency", event.durationMs, {
        unit: "millisecond",
        attributes: {
          provider: event.provider,
          operation: "stt_batch",
          status: "error",
        },
      });
      break;

    case "stt.websocket.connected":
      Sentry.metrics.count("websocket.connected", 1, {
        attributes: { provider: event.provider },
      });
      break;

    case "stt.websocket.disconnected":
      Sentry.metrics.distribution("websocket.duration", event.durationMs, {
        unit: "millisecond",
        attributes: { provider: event.provider },
      });
      break;

    case "stt.websocket.error":
      Sentry.captureException(event.error, {
        user: event.userId ? { id: event.userId } : undefined,
        tags: { provider: event.provider, operation: "websocket" },
      });
      break;

    default:
      event satisfies never;
  }
}
