import { beforeEach, describe, expect, test } from "vitest";
import { createListenerStore } from ".";

let store: ReturnType<typeof createListenerStore>;

describe("General Listener Slice", () => {
  beforeEach(() => {
    store = createListenerStore();
  });

  describe("Initial State", () => {
    test("initializes with correct default values", () => {
      const state = store.getState();
      expect(state.status).toBe("inactive");
      expect(state.loading).toBe(false);
      expect(state.amplitude).toEqual({ mic: 0, speaker: 0 });
      expect(state.seconds).toBe(0);
      expect(state.sessionEventUnlisten).toBeUndefined();
      expect(state.intervalId).toBeUndefined();
      expect(state.sessionModes).toEqual({});
    });
  });

  describe("Amplitude Updates", () => {
    test("amplitude state is initialized to zero", () => {
      const state = store.getState();
      expect(state.amplitude).toEqual({ mic: 0, speaker: 0 });
    });
  });

  describe("Session Mode Helpers", () => {
    test("getSessionMode defaults to inactive", () => {
      const state = store.getState();
      expect(state.getSessionMode("session-123")).toBe("inactive");
    });

    test("setSessionMode updates tracking and clears on inactive", () => {
      const { setSessionMode, getSessionMode } = store.getState();

      setSessionMode("session-456", "running_batch");
      expect(getSessionMode("session-456")).toBe("running_batch");

      setSessionMode("session-456", "inactive");
      expect(getSessionMode("session-456")).toBe("inactive");
    });
  });

  describe("Batch State", () => {
    test("handleBatchProgress tracks progress per session", () => {
      const sessionId = "session-progress";
      const { handleBatchProgress, clearBatchSession } = store.getState();

      handleBatchProgress(sessionId, { audioDuration: 10, transcriptDuration: 5 });
      expect(store.getState().batchProgressBySession[sessionId]).toEqual({ audioDuration: 10, transcriptDuration: 5 });

      clearBatchSession(sessionId);
      expect(store.getState().batchProgressBySession[sessionId]).toBeUndefined();
    });
  });

  describe("Stop Action", () => {
    test("stop action exists and is callable", () => {
      const stop = store.getState().stop;
      expect(typeof stop).toBe("function");
    });
  });

  describe("Start Action", () => {
    test("start action exists and is callable", () => {
      const start = store.getState().start;
      expect(typeof start).toBe("function");
    });
  });
});
