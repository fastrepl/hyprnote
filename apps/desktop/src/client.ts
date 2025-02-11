import { createClient, createConfig } from "@hypr/client";
export * from "@hypr/client/gen/sdk";
export * from "@hypr/client/gen/types";
export * from "@hypr/client/gen/tanstack";

import { fetch } from "@tauri-apps/plugin-http";
import { Channel } from "@tauri-apps/api/core";

import { commands, EnhanceRequest, NangoIntegration } from "@/types";

export const baseUrl = import.meta.env.DEV
  ? "http://localhost:1234"
  : "https://app.hyprnote.com";

export const client = createClient(
  createConfig({
    fetch,
    auth: () => "123",
    baseUrl,
  }),
);

export function getIntegrationURL(type: NangoIntegration) {
  return new URL(`/integrations?provider=${type}`, baseUrl).toString();
}

export function enhance(req: EnhanceRequest) {
  const channel = new Channel<string>();
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      channel.onmessage = (message) => {
        try {
          controller.enqueue(encoder.encode(message));
        } catch (_ignored) {}
      };

      commands.runEnhance(req, channel).finally(() => {
        channel.onmessage = () => {};
        controller.close();
      });
    },
  });
}
