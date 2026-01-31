import { describe, expect, test } from "vitest";

import { createTestSettingsStore } from "../store/tinybase/persister/testing/mocks";

describe("Pro model auto-config store logic", () => {
  test("on becoming Pro: saves non-Pro config and sets Pro models", () => {
    const store = createTestSettingsStore();

    store.setValue("current_stt_provider", "openai");
    store.setValue("current_stt_model", "whisper-1");
    store.setValue("current_llm_provider", "anthropic");
    store.setValue("current_llm_model", "claude-3");

    const currentSttProvider = store.getValue("current_stt_provider");
    const currentSttModel = store.getValue("current_stt_model");
    const currentLlmProvider = store.getValue("current_llm_provider");
    const currentLlmModel = store.getValue("current_llm_model");

    if (currentSttProvider && currentSttProvider !== "hyprnote") {
      store.setValue("pre_pro_stt_provider", currentSttProvider);
      store.setValue("pre_pro_stt_model", currentSttModel ?? "");
    }
    if (currentLlmProvider && currentLlmProvider !== "hyprnote") {
      store.setValue("pre_pro_llm_provider", currentLlmProvider);
      store.setValue("pre_pro_llm_model", currentLlmModel ?? "");
    }

    store.setValue("current_stt_provider", "hyprnote");
    store.setValue("current_stt_model", "cloud");
    store.setValue("current_llm_provider", "hyprnote");
    store.setValue("current_llm_model", "Auto");

    expect(store.getValue("current_stt_provider")).toBe("hyprnote");
    expect(store.getValue("current_stt_model")).toBe("cloud");
    expect(store.getValue("current_llm_provider")).toBe("hyprnote");
    expect(store.getValue("current_llm_model")).toBe("Auto");
    expect(store.getValue("pre_pro_stt_provider")).toBe("openai");
    expect(store.getValue("pre_pro_stt_model")).toBe("whisper-1");
    expect(store.getValue("pre_pro_llm_provider")).toBe("anthropic");
    expect(store.getValue("pre_pro_llm_model")).toBe("claude-3");
  });

  test("on sign-out: restores pre-Pro config and clears saved values", () => {
    const store = createTestSettingsStore();

    store.setValue("current_stt_provider", "hyprnote");
    store.setValue("current_stt_model", "cloud");
    store.setValue("current_llm_provider", "hyprnote");
    store.setValue("current_llm_model", "Auto");
    store.setValue("pre_pro_stt_provider", "openai");
    store.setValue("pre_pro_stt_model", "whisper-1");
    store.setValue("pre_pro_llm_provider", "anthropic");
    store.setValue("pre_pro_llm_model", "claude-3");

    const preProSttProvider = store.getValue("pre_pro_stt_provider");
    const preProSttModel = store.getValue("pre_pro_stt_model");
    const preProLlmProvider = store.getValue("pre_pro_llm_provider");
    const preProLlmModel = store.getValue("pre_pro_llm_model");

    if (preProSttProvider) {
      store.setValue("current_stt_provider", preProSttProvider);
      store.setValue("current_stt_model", preProSttModel ?? "");
    } else {
      store.setValue("current_stt_provider", "");
      store.setValue("current_stt_model", "");
    }

    if (preProLlmProvider) {
      store.setValue("current_llm_provider", preProLlmProvider);
      store.setValue("current_llm_model", preProLlmModel ?? "");
    } else {
      store.setValue("current_llm_provider", "");
      store.setValue("current_llm_model", "");
    }

    store.setValue("pre_pro_stt_provider", "");
    store.setValue("pre_pro_stt_model", "");
    store.setValue("pre_pro_llm_provider", "");
    store.setValue("pre_pro_llm_model", "");

    expect(store.getValue("current_stt_provider")).toBe("openai");
    expect(store.getValue("current_stt_model")).toBe("whisper-1");
    expect(store.getValue("current_llm_provider")).toBe("anthropic");
    expect(store.getValue("current_llm_model")).toBe("claude-3");
    expect(store.getValue("pre_pro_stt_provider")).toBe("");
    expect(store.getValue("pre_pro_stt_model")).toBe("");
    expect(store.getValue("pre_pro_llm_provider")).toBe("");
    expect(store.getValue("pre_pro_llm_model")).toBe("");
  });

  test("on sign-out without pre-Pro config: clears current config", () => {
    const store = createTestSettingsStore();

    store.setValue("current_stt_provider", "hyprnote");
    store.setValue("current_stt_model", "cloud");
    store.setValue("current_llm_provider", "hyprnote");
    store.setValue("current_llm_model", "Auto");

    const preProSttProvider = store.getValue("pre_pro_stt_provider");
    const preProLlmProvider = store.getValue("pre_pro_llm_provider");

    if (preProSttProvider) {
      store.setValue("current_stt_provider", preProSttProvider);
    } else {
      store.setValue("current_stt_provider", "");
      store.setValue("current_stt_model", "");
    }

    if (preProLlmProvider) {
      store.setValue("current_llm_provider", preProLlmProvider);
    } else {
      store.setValue("current_llm_provider", "");
      store.setValue("current_llm_model", "");
    }

    expect(store.getValue("current_stt_provider")).toBe("");
    expect(store.getValue("current_stt_model")).toBe("");
    expect(store.getValue("current_llm_provider")).toBe("");
    expect(store.getValue("current_llm_model")).toBe("");
  });

  test("full flow: non-Pro -> Pro -> sign-out restores original config", () => {
    const store = createTestSettingsStore();

    store.setValue("current_stt_provider", "deepgram");
    store.setValue("current_stt_model", "nova-2");
    store.setValue("current_llm_provider", "openai");
    store.setValue("current_llm_model", "gpt-4");

    const sttBefore = store.getValue("current_stt_provider");
    const sttModelBefore = store.getValue("current_stt_model");
    const llmBefore = store.getValue("current_llm_provider");
    const llmModelBefore = store.getValue("current_llm_model");

    if (sttBefore && sttBefore !== "hyprnote") {
      store.setValue("pre_pro_stt_provider", sttBefore);
      store.setValue("pre_pro_stt_model", sttModelBefore ?? "");
    }
    if (llmBefore && llmBefore !== "hyprnote") {
      store.setValue("pre_pro_llm_provider", llmBefore);
      store.setValue("pre_pro_llm_model", llmModelBefore ?? "");
    }
    store.setValue("current_stt_provider", "hyprnote");
    store.setValue("current_stt_model", "cloud");
    store.setValue("current_llm_provider", "hyprnote");
    store.setValue("current_llm_model", "Auto");

    expect(store.getValue("current_stt_provider")).toBe("hyprnote");
    expect(store.getValue("current_llm_provider")).toBe("hyprnote");

    const preProStt = store.getValue("pre_pro_stt_provider");
    const preProSttModel = store.getValue("pre_pro_stt_model");
    const preProLlm = store.getValue("pre_pro_llm_provider");
    const preProLlmModel = store.getValue("pre_pro_llm_model");

    if (preProStt) {
      store.setValue("current_stt_provider", preProStt);
      store.setValue("current_stt_model", preProSttModel ?? "");
    }
    if (preProLlm) {
      store.setValue("current_llm_provider", preProLlm);
      store.setValue("current_llm_model", preProLlmModel ?? "");
    }
    store.setValue("pre_pro_stt_provider", "");
    store.setValue("pre_pro_stt_model", "");
    store.setValue("pre_pro_llm_provider", "");
    store.setValue("pre_pro_llm_model", "");

    expect(store.getValue("current_stt_provider")).toBe("deepgram");
    expect(store.getValue("current_stt_model")).toBe("nova-2");
    expect(store.getValue("current_llm_provider")).toBe("openai");
    expect(store.getValue("current_llm_model")).toBe("gpt-4");
    expect(store.getValue("pre_pro_stt_provider")).toBe("");
    expect(store.getValue("pre_pro_llm_provider")).toBe("");
  });
});
