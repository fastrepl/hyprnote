import { createClient, createConfig } from "@hypr/client";
export * from "@hypr/client/gen/sdk";
export * from "@hypr/client/gen/types";
export * from "@hypr/client/gen/tanstack";

import { fetch } from "@tauri-apps/plugin-http";

export const client = createClient(
  createConfig({
    fetch,
    auth: () => "123",
    baseUrl: import.meta.env.DEV
      ? "http://localhost:1234"
      : "https://app.hyprnote.com",
  }),
);
