import type { Context, Next } from "hono";

import { env } from "../env";
import type { AppBindings } from "../hono-bindings";

const REQUEST_TIMEOUT_MS = 120_000;

export async function forwardToAiService(
  c: Context<AppBindings>,
  next: Next,
  targetPath: string,
): Promise<Response | void> {
  if (!env.AI_SERVICE_URL) {
    return next();
  }

  const targetUrl = new URL(targetPath, env.AI_SERVICE_URL);
  const clientUrl = new URL(c.req.url);
  targetUrl.search = clientUrl.search;

  const authHeader = c.req.header("authorization");

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutController.abort(),
    REQUEST_TIMEOUT_MS,
  );
  const signal = AbortSignal.any([c.req.raw.signal, timeoutController.signal]);

  try {
    const response = await fetch(targetUrl.toString(), {
      method: c.req.method,
      headers: {
        "Content-Type": c.req.header("content-type") ?? "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: c.req.raw.body,
      // @ts-expect-error - duplex is required for streaming request bodies
      duplex: "half",
      signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": contentType || "application/json" },
    });
  } catch (error) {
    if (signal.aborted) {
      const isTimeout = timeoutController.signal.aborted;
      return new Response(
        isTimeout ? "Request timeout" : "Client disconnected",
        { status: isTimeout ? 504 : 499 },
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const forwardLlmToAi = async (
  c: Context<AppBindings>,
  next: Next,
): Promise<Response | void> => {
  return forwardToAiService(c, next, "/llm/chat/completions");
};

export const forwardSttListenToAi = async (
  c: Context<AppBindings>,
  next: Next,
): Promise<Response | void> => {
  return forwardToAiService(c, next, "/stt/listen");
};

export const forwardSttTranscribeToAi = async (
  c: Context<AppBindings>,
  next: Next,
): Promise<Response | void> => {
  return forwardToAiService(c, next, "/stt/");
};
