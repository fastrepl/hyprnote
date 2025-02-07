import { createClient, createConfig } from "@hypr/client";
export * from "@hypr/client/gen/sdk";
export * from "@hypr/client/gen/types";
export * from "@hypr/client/gen/tanstack";

export const client = createClient(createConfig({ baseUrl: "/" }));
