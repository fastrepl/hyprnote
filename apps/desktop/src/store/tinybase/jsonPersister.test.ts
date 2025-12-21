import { createMergeableStore } from "tinybase/with-schemas";
import { describe, expect, test } from "vitest";

import { settingsToContent, storeToSettings } from "./jsonPersister";

describe("jsonPersister roundtrip", () => {
  test("settings -> store -> settings preserves all data", () => {
    const original = {
      ai: {
        llm: {
          openai: {
            base_url: "https://api.openai.com",
            api_key: "sk-123",
          },
          anthropic: {
            base_url: "https://api.anthropic.com",
            api_key: "sk-456",
          },
        },
        stt: {
          deepgram: {
            base_url: "https://api.deepgram.com",
            api_key: "dg-789",
          },
        },
        current_llm_provider: "openai",
        current_llm_model: "gpt-4",
        current_stt_provider: "deepgram",
        current_stt_model: "nova-2",
      },
      notification: {
        event: true,
        detect: false,
        respect_dnd: true,
        ignored_platforms: "zoom,slack",
      },
      general: {
        autostart: true,
        save_recordings: false,
        quit_intercept: true,
        telemetry_consent: false,
        ai_language: "en",
        spoken_languages: "en,ko",
        dismissed_banners: "banner1,banner2",
      },
    };

    const [tables, values] = settingsToContent(original);
    const store = createMergeableStore();
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result).toEqual({ ...original, data: {} });
  });

  test("store -> settings -> store preserves all data", () => {
    const store = createMergeableStore();

    const originalTables = {
      ai_providers: {
        openai: {
          type: "llm",
          base_url: "https://api.openai.com",
          api_key: "sk-123",
        },
        anthropic: {
          type: "llm",
          base_url: "https://api.anthropic.com",
          api_key: "sk-456",
        },
        deepgram: {
          type: "stt",
          base_url: "https://api.deepgram.com",
          api_key: "dg-789",
        },
      },
    };

    const originalValues = {
      current_llm_provider: "openai",
      current_llm_model: "gpt-4",
      current_stt_provider: "deepgram",
      current_stt_model: "nova-2",
      notification_event: true,
      notification_detect: false,
      respect_dnd: true,
      ignored_platforms: "zoom",
      autostart: true,
      save_recordings: false,
      quit_intercept: true,
      telemetry_consent: false,
      ai_language: "en",
      spoken_languages: "en,ko",
      dismissed_banners: "banner1",
    };

    store.setTables(originalTables);
    store.setValues(originalValues);

    const settings = storeToSettings(store);
    const [tables, values] = settingsToContent(settings);

    expect(tables).toEqual(originalTables);
    expect(values).toEqual(originalValues);
  });

  test("handles empty data", () => {
    const original = {};

    const [tables, values] = settingsToContent(original);
    const store = createMergeableStore();
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result).toEqual({
      ai: { llm: {}, stt: {} },
      notification: {},
      general: {},
      data: {},
    });
  });

  test("handles partial data - only ai settings", () => {
    const original = {
      ai: {
        llm: {
          openai: {
            base_url: "https://api.openai.com",
            api_key: "sk-123",
          },
        },
        stt: {},
        current_llm_provider: "openai",
      },
    };

    const [tables, values] = settingsToContent(original);
    const store = createMergeableStore();
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store) as typeof original & {
      ai: { llm: unknown; stt: unknown };
    };

    expect(result.ai?.llm).toEqual(original.ai?.llm);
    expect(result.ai?.current_llm_provider).toEqual(
      original.ai?.current_llm_provider,
    );
  });

  test("handles partial data - only notification settings", () => {
    const original = {
      notification: {
        event: true,
        respect_dnd: false,
      },
    };

    const [tables, values] = settingsToContent(original);
    const store = createMergeableStore();
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result.notification).toEqual(original.notification);
  });

  test("handles partial data - only general settings", () => {
    const original = {
      general: {
        autostart: true,
        ai_language: "ko",
      },
    };

    const [tables, values] = settingsToContent(original);
    const store = createMergeableStore();
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result.general).toEqual(original.general);
  });
});
