import * as Sentry from "@sentry/react";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

export const tracedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.toString();
  const method = init?.method ?? "GET";

  return Sentry.startSpan(
    {
      name: `HTTP ${method} ${new URL(url).pathname}`,
      op: "http.client",
      attributes: { "http.url": url, "http.method": method },
    },
    async (span) => {
      const headers = new Headers(init?.headers);

      const traceHeader = Sentry.spanToTraceHeader(span);
      const baggageHeader = Sentry.spanToBaggageHeader(span);

      headers.set("sentry-trace", traceHeader);
      if (baggageHeader) {
        headers.set("baggage", baggageHeader);
      }

      const response = await tauriFetch(input, { ...init, headers });

      span.setAttribute("http.status_code", response.status);

      return response;
    },
  );
};
