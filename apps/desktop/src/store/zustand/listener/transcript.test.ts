import { beforeEach, describe, expect, test, vi } from "vitest";
import { createListenerStore } from ".";

let store: ReturnType<typeof createListenerStore>;

describe("Transcript Listener Slice", () => {
  beforeEach(() => {
    store = createListenerStore();
  });

  describe("Initial State", () => {
    test("initializes with correct default values", () => {
      const state = store.getState();
      expect(state.partialWordsByChannel).toEqual({});
      expect(state.handlePersist).toBeUndefined();
    });
  });

  describe("setTranscriptPersist", () => {
    test("sets persist callback", () => {
      const callback = vi.fn();
      store.getState().setTranscriptPersist(callback);
      expect(store.getState().handlePersist).toBe(callback);
    });

    test("can clear persist callback", () => {
      const callback = vi.fn();
      store.getState().setTranscriptPersist(callback);
      store.getState().setTranscriptPersist(undefined);
      expect(store.getState().handlePersist).toBeUndefined();
    });
  });

  describe("resetTranscript", () => {
    test("resets all transcript state to initial values", () => {
      store.getState().setTranscriptPersist(() => {});

      store.getState().resetTranscript();

      const state = store.getState();
      expect(state.partialWordsByChannel).toEqual({});
      expect(state.handlePersist).toBeUndefined();
    });
  });

  describe("handleTranscriptResponse", () => {
    test("ignores non-Results responses", () => {
      const response = { type: "Invalid" } as any;
      store.getState().handleTranscriptResponse(response);
      expect(store.getState().partialWordsByChannel).toEqual({});
    });

    test("ignores responses with missing channel data", () => {
      const response = {
        type: "Results",
        channel_index: [undefined],
        channel: { alternatives: [{ words: [] }] },
        is_final: false,
      } as any;

      store.getState().handleTranscriptResponse(response);
      expect(store.getState().partialWordsByChannel).toEqual({});
    });
  });
});
