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
    });
  });

  describe("Amplitude Updates", () => {
    test("amplitude state is initialized to zero", () => {
      const state = store.getState();
      expect(state.amplitude).toEqual({ mic: 0, speaker: 0 });
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
