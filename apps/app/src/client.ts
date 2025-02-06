import { createClient, createConfig } from "@hypr/client";
export * from "@hypr/client/gen/sdk";
export * from "@hypr/client/gen/types";

export const client = createClient(
  createConfig({
    baseUrl: "http://localhost:3000",
  }),
);
