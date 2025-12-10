import { createMergeableStore } from "tinybase/with-schemas";
import { describe, expect, test } from "vitest";

import {
  fromSimplifiedFormat,
  SimplifiedFormat,
  toSimplifiedFormat,
} from "./jsonPersister";

describe("jsonPersister transforms", () => {
  test("roundtrip: toSimplifiedFormat -> fromSimplifiedFormat", () => {
    const store = createMergeableStore();

    store.setTable("ai_providers", {
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
    });

    const simplified = toSimplifiedFormat(store);
    const [tables] = fromSimplifiedFormat(simplified);

    expect(tables).toEqual({
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
    });
  });

  test("toSimplifiedFormat groups by type", () => {
    const store = createMergeableStore();

    store.setTable("ai_providers", {
      openai: {
        type: "llm",
        base_url: "https://api.openai.com",
        api_key: "sk-123",
      },
      deepgram: {
        type: "stt",
        base_url: "https://api.deepgram.com",
        api_key: "dg-789",
      },
    });

    const result = toSimplifiedFormat(store);

    expect(result).toEqual({
      llm: {
        openai: { base_url: "https://api.openai.com", api_key: "sk-123" },
      },
      stt: {
        deepgram: { base_url: "https://api.deepgram.com", api_key: "dg-789" },
      },
    });
  });

  test("fromSimplifiedFormat flattens grouped data", () => {
    const simplified: SimplifiedFormat = {
      llm: {
        openai: { base_url: "https://api.openai.com", api_key: "sk-123" },
      },
      stt: {
        deepgram: { base_url: "https://api.deepgram.com", api_key: "dg-789" },
      },
    };

    const [tables] = fromSimplifiedFormat(simplified);

    expect(tables).toEqual({
      ai_providers: {
        openai: {
          type: "llm",
          base_url: "https://api.openai.com",
          api_key: "sk-123",
        },
        deepgram: {
          type: "stt",
          base_url: "https://api.deepgram.com",
          api_key: "dg-789",
        },
      },
    });
  });

  test("handles empty data", () => {
    const store = createMergeableStore();

    const simplified = toSimplifiedFormat(store);
    expect(simplified).toEqual({ llm: {}, stt: {} });

    const [tables] = fromSimplifiedFormat(simplified);
    expect(tables).toEqual({ ai_providers: {} });
  });
});
