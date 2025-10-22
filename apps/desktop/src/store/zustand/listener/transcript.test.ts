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
      expect(state.managerOffsetMs).toBe(0);
      expect(state.partialWordsByChannel).toEqual({});
      expect(state.persistFinal).toBeUndefined();
    });
  });

  describe("setTranscriptManagerOffset", () => {
    test("updates manager offset", () => {
      store.getState().setTranscriptManagerOffset(5000);
      expect(store.getState().managerOffsetMs).toBe(5000);
    });

    test("can update offset multiple times", () => {
      store.getState().setTranscriptManagerOffset(1000);
      expect(store.getState().managerOffsetMs).toBe(1000);
      store.getState().setTranscriptManagerOffset(3000);
      expect(store.getState().managerOffsetMs).toBe(3000);
    });
  });

  describe("setTranscriptPersist", () => {
    test("sets persist callback", () => {
      const callback = vi.fn();
      store.getState().setTranscriptPersist(callback);
      expect(store.getState().persistFinal).toBe(callback);
    });

    test("can clear persist callback", () => {
      const callback = vi.fn();
      store.getState().setTranscriptPersist(callback);
      store.getState().setTranscriptPersist(undefined);
      expect(store.getState().persistFinal).toBeUndefined();
    });
  });

  describe("resetTranscript", () => {
    test("resets all transcript state to initial values", () => {
      store.getState().setTranscriptManagerOffset(5000);
      store.getState().setTranscriptPersist(() => {});

      store.getState().resetTranscript();

      const state = store.getState();
      expect(state.managerOffsetMs).toBe(0);
      expect(state.partialWordsByChannel).toEqual({});
      expect(state.persistFinal).toBeUndefined();
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
