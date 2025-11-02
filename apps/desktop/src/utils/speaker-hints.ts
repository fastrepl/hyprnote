import { providerSpeakerIndexSchema } from "@hypr/db";
import type { ProviderSpeakerIndexHint } from "@hypr/db";
import type { SpeakerHintStorage } from "../store/tinybase/schema-external";
import type { RuntimeSpeakerHint } from "./segment";

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

export function convertStorageHintsToRuntime(
  storageHints: SpeakerHintStorage[],
  wordIdToIndex: Map<string, number>,
): RuntimeSpeakerHint[] {
  const hints: RuntimeSpeakerHint[] = [];

  storageHints.forEach((hint) => {
    if (typeof hint.word_id !== "string") {
      return;
    }

    const wordIndex = wordIdToIndex.get(hint.word_id);
    if (typeof wordIndex !== "number") {
      return;
    }

    if (hint.type === "provider_speaker_index") {
      const parsed = parseProviderSpeakerIndex(hint.value);
      if (parsed) {
        hints.push({
          wordIndex,
          data: {
            type: "provider_speaker_index",
            speaker_index: parsed.speaker_index,
            provider: parsed.provider,
            channel: parsed.channel,
          },
        });
      }
    }
  });

  return hints;
}
