import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import { commands as detectCommands } from "@hypr/plugin-detect";
import { commands } from "@hypr/plugin-settings";

import { StoreOrMergeableStore } from "../../store/shared";
import { settingsToContent, storeToSettings } from "./transform";

export const createSettingsPersister = createPersisterBuilder({
  toStore: settingsToContent,
  fromStore: storeToSettings,
});

interface TransformUtils<T, Schemas extends OptionalSchemas> {
  toStore: (data: T) => Content<Schemas>;
  fromStore: (store: MergeableStore<Schemas>) => T;
}

function createPersisterBuilder<T, Schemas extends OptionalSchemas>(
  transform: TransformUtils<T, Schemas>,
) {
  return (store: MergeableStore<Schemas>) =>
    createCustomPersister(
      store,
      async (): Promise<Content<Schemas> | undefined> => {
        const [result, languageDefaults] = await Promise.all([
          commands.load(),
          getLanguageDefaults(),
        ]);

        if (result.status === "error") {
          console.error("[SettingsPersister] load error:", result.error);
          return undefined;
        }

        const settings = applyLanguageDefaults(
          result.data as Record<string, unknown>,
          languageDefaults,
        );

        return transform.toStore(settings as T);
      },
      async () => {
        const settings = transform.fromStore(store);
        const result = await commands.save(
          settings as Parameters<typeof commands.save>[0],
        );
        if (result.status === "error") {
          console.error("[SettingsPersister] save error:", result.error);
        }
      },
      () => undefined,
      () => {},
      (error) => console.error("[SettingsPersister]:", error),
      StoreOrMergeableStore,
    );
}

async function getLanguageDefaults(): Promise<{
  ai_language?: string;
  spoken_languages?: string[];
}> {
  const result = await detectCommands.getPreferredLanguages();

  if (result.status !== "ok" || result.data.length === 0) {
    return {};
  }

  return {
    ai_language: result.data[0],
    spoken_languages: result.data,
  };
}

function applyLanguageDefaults(
  settings: Record<string, unknown>,
  defaults: { ai_language?: string; spoken_languages?: string[] },
): Record<string, unknown> {
  const language = (settings.language ?? {}) as Record<string, unknown>;

  if (language.ai_language == null && defaults.ai_language) {
    language.ai_language = defaults.ai_language;
  }

  if (language.spoken_languages == null && defaults.spoken_languages) {
    language.spoken_languages = defaults.spoken_languages;
  }

  return { ...settings, language };
}
