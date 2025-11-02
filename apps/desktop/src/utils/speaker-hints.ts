import { providerSpeakerIndexSchema } from "@hypr/db";
import type { ProviderSpeakerIndexHint } from "@hypr/db";

export type { ProviderSpeakerIndexHint };

export const parseProviderSpeakerIndex = (raw: unknown): ProviderSpeakerIndexHint | undefined => {
  if (raw == null) {
    return undefined;
  }

  const data = typeof raw === "string"
    ? (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return undefined;
      }
    })()
    : raw;

  return providerSpeakerIndexSchema.safeParse(data).data;
};
