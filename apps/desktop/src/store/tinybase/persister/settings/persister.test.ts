import { createMergeableStore } from "tinybase/with-schemas";
import { describe, expect, test } from "vitest";

import { SCHEMA } from "../../store/settings";
import { settingsToContent, storeToSettings } from "./transform";

describe("settingsPersister roundtrip", () => {
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
        ignored_platforms: ["zoom", "slack"],
      },
      general: {
        autostart: true,
        save_recordings: false,
        quit_intercept: true,
        telemetry_consent: false,
      },
      language: {
        ai_language: "en",
        spoken_languages: ["en", "ko"],
      },
    };

    const [tables, values] = settingsToContent(original);
    const store = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result).toEqual(original);
  });

  test("store -> settings -> store preserves all data", () => {
    const store = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);

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
      ignored_platforms: '["zoom"]',
      autostart: true,
      save_recordings: false,
      quit_intercept: true,
      telemetry_consent: false,
      ai_language: "en",
      spoken_languages: '["en","ko"]',
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
    const store = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result).toEqual({
      ai: { llm: {}, stt: {} },
      notification: {},
      general: {},
      language: {},
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
    const store = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);
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
    const store = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result.notification).toEqual(original.notification);
  });

  test("handles partial data - only general settings", () => {
    const original = {
      general: {
        autostart: true,
      },
    };

    const [tables, values] = settingsToContent(original);
    const store = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result.general).toEqual(original.general);
  });

  test("handles partial data - only language settings", () => {
    const original = {
      language: {
        ai_language: "ko",
        spoken_languages: ["ko", "en"],
      },
    };

    const [tables, values] = settingsToContent(original);
    const store = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result.language).toEqual(original.language);
  });

  test("handles migration from double-encoded JSON strings", () => {
    const doubleEncoded = {
      language: {
        spoken_languages: '["en","ko"]',
      },
      notification: {
        ignored_platforms: '["zoom"]',
      },
    };

    const [tables, values] = settingsToContent(doubleEncoded);
    const store = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result.language).toEqual({
      spoken_languages: ["en", "ko"],
    });
    expect(result.notification).toEqual({
      ignored_platforms: ["zoom"],
    });
  });

  test("handles migration from comma-separated strings (old format)", () => {
    const oldFormat = {
      language: {
        spoken_languages: "en,ko,ja",
      },
      notification: {
        ignored_platforms: "zoom,slack",
      },
    };

    const [tables, values] = settingsToContent(oldFormat);
    const store = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result.language).toEqual({
      spoken_languages: ["en", "ko", "ja"],
    });
    expect(result.notification).toEqual({
      ignored_platforms: ["zoom", "slack"],
    });
  });

  test("handles migration from general section to language section", () => {
    const oldSettings = {
      general: {
        autostart: true,
        ai_language: "ko",
        spoken_languages: ["ko", "en"],
      },
    };

    const [tables, values] = settingsToContent(oldSettings);
    const store = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result.language).toEqual({
      ai_language: "ko",
      spoken_languages: ["ko", "en"],
    });
    expect(result.general).toEqual({
      autostart: true,
    });
  });

  test("handles migration from general section with comma-separated spoken_languages", () => {
    const oldSettings = {
      general: {
        ai_language: "ja",
        spoken_languages: "ja,en,ko",
      },
    };

    const [tables, values] = settingsToContent(oldSettings);
    const store = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result.language).toEqual({
      ai_language: "ja",
      spoken_languages: ["ja", "en", "ko"],
    });
  });

  test("language section takes precedence over general section", () => {
    const mixedSettings = {
      general: {
        ai_language: "en",
        spoken_languages: ["en"],
      },
      language: {
        ai_language: "ko",
        spoken_languages: ["ko", "ja"],
      },
    };

    const [tables, values] = settingsToContent(mixedSettings);
    const store = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);
    store.setTables(tables);
    store.setValues(values);
    const result = storeToSettings(store);

    expect(result.language).toEqual({
      ai_language: "ko",
      spoken_languages: ["ko", "ja"],
    });
  });
});
