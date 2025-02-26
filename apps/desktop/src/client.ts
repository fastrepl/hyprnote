import { createClient, createConfig } from "@hypr/client";
export * from "@hypr/client/gen/sdk";
export * from "@hypr/client/gen/types";
export * from "@hypr/client/gen/tanstack";

import { fetch } from "@hypr/utils";
import { Channel } from "@tauri-apps/api/core";

import { NangoIntegration } from "@/types";

export const baseUrl = import.meta.env.DEV
  ? "http://localhost:1234"
  : "https://app.hyprnote.com";

export const client = createClient(
  createConfig({
    fetch,
    auth: async () => "123",
    baseUrl,
  }),
);

export function getIntegrationURL(type: NangoIntegration) {
  return new URL(`/integrations?provider=${type}`, baseUrl).toString();
}

// TODO: replace with ai sdk

// We can't use SSE with generated client: https://github.com/hey-api/openapi-ts/issues/772
export function enhance(req: any) {
  const channel = new Channel<string>();
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      channel.onmessage = (message) => {
        try {
          controller.enqueue(encoder.encode(message));
        } catch (_ignored) {}
      };

      // TODO
      // commands.runEnhance(req, channel).finally(() => {
      //   channel.onmessage = () => {};
      //   controller.close();
      // });
    },
  });
}
