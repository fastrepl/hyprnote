import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  createDebouncedBatcher,
  isFileNotFoundError,
  safeParseJson,
} from "./fs";

describe("safeParseJson", () => {
  describe("string input", () => {
    test("parses valid JSON string", () => {
      const result = safeParseJson('{"key": "value"}');
      expect(result).toEqual({ key: "value" });
    });

    test("parses nested JSON", () => {
      const result = safeParseJson('{"outer": {"inner": 123}}');
      expect(result).toEqual({ outer: { inner: 123 } });
    });

    test("parses JSON with array", () => {
      const result = safeParseJson('{"items": [1, 2, 3]}');
      expect(result).toEqual({ items: [1, 2, 3] });
    });

    test("returns undefined for invalid JSON string", () => {
      const result = safeParseJson("not valid json");
      expect(result).toBeUndefined();
    });

    test("returns undefined for empty string", () => {
      const result = safeParseJson("");
      expect(result).toBeUndefined();
    });

    test("returns undefined for partial JSON", () => {
      const result = safeParseJson('{"key":');
      expect(result).toBeUndefined();
    });

    test("parses empty object string", () => {
      const result = safeParseJson("{}");
      expect(result).toEqual({});
    });
  });

  describe("object input", () => {
    test("returns object as-is", () => {
      const obj = { key: "value" };
      const result = safeParseJson(obj);
      expect(result).toBe(obj);
    });

    test("returns nested object as-is", () => {
      const obj = { outer: { inner: 123 } };
      const result = safeParseJson(obj);
      expect(result).toBe(obj);
    });

    test("returns empty object as-is", () => {
      const obj = {};
      const result = safeParseJson(obj);
      expect(result).toBe(obj);
    });
  });

  describe("null/undefined input", () => {
    test("returns undefined for null", () => {
      const result = safeParseJson(null);
      expect(result).toBeUndefined();
    });

    test("returns undefined for undefined", () => {
      const result = safeParseJson(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("other types", () => {
    test("returns undefined for number", () => {
      const result = safeParseJson(123);
      expect(result).toBeUndefined();
    });

    test("returns undefined for boolean", () => {
      const result = safeParseJson(true);
      expect(result).toBeUndefined();
    });

    test("returns array as object (arrays pass typeof check)", () => {
      const arr = [1, 2, 3];
      const result = safeParseJson(arr);
      expect(result).toBe(arr);
    });
  });
});

describe("isFileNotFoundError", () => {
  test("returns true for 'No such file or directory'", () => {
    const error = new Error("No such file or directory");
    expect(isFileNotFoundError(error)).toBe(true);
  });

  test("returns true for ENOENT error", () => {
    const error = new Error("ENOENT: no such file");
    expect(isFileNotFoundError(error)).toBe(true);
  });

  test("returns true for 'not found' error", () => {
    const error = new Error("File not found");
    expect(isFileNotFoundError(error)).toBe(true);
  });

  test("returns true for string error with 'not found'", () => {
    expect(isFileNotFoundError("Resource not found")).toBe(true);
  });

  test("returns false for other errors", () => {
    const error = new Error("Permission denied");
    expect(isFileNotFoundError(error)).toBe(false);
  });

  test("returns false for empty error", () => {
    const error = new Error("");
    expect(isFileNotFoundError(error)).toBe(false);
  });

  test("handles object with toString", () => {
    const error = {
      toString: () => "ENOENT error occurred",
    };
    expect(isFileNotFoundError(error)).toBe(true);
  });

  test("handles null error", () => {
    expect(isFileNotFoundError(null)).toBe(false);
  });

  test("handles undefined error", () => {
    expect(isFileNotFoundError(undefined)).toBe(false);
  });

  test("case sensitive matching", () => {
    expect(isFileNotFoundError("enoent")).toBe(false);
    expect(isFileNotFoundError("NOT FOUND")).toBe(false);
  });
});

describe("createDebouncedBatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("batches items and flushes after debounce time", () => {
    const onFlush = vi.fn();
    const batcher = createDebouncedBatcher<string>(onFlush, 100);

    batcher.add("key1", "value1");
    batcher.add("key2", "value2");

    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith(
      new Map([
        ["key1", "value1"],
        ["key2", "value2"],
      ]),
    );
  });

  test("resets debounce timer on each add", () => {
    const onFlush = vi.fn();
    const batcher = createDebouncedBatcher<string>(onFlush, 100);

    batcher.add("key1", "value1");
    vi.advanceTimersByTime(50);

    batcher.add("key2", "value2");
    vi.advanceTimersByTime(50);

    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);

    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  test("overwrites value for same key", () => {
    const onFlush = vi.fn();
    const batcher = createDebouncedBatcher<string>(onFlush, 100);

    batcher.add("key1", "value1");
    batcher.add("key1", "value2");

    vi.advanceTimersByTime(100);

    expect(onFlush).toHaveBeenCalledWith(new Map([["key1", "value2"]]));
  });

  test("flush() triggers immediate flush", () => {
    const onFlush = vi.fn();
    const batcher = createDebouncedBatcher<string>(onFlush, 100);

    batcher.add("key1", "value1");
    batcher.flush();

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith(new Map([["key1", "value1"]]));
  });

  test("flush() does nothing if no pending items", () => {
    const onFlush = vi.fn();
    const batcher = createDebouncedBatcher<string>(onFlush, 100);

    batcher.flush();

    expect(onFlush).not.toHaveBeenCalled();
  });

  test("flush() cancels pending timeout", () => {
    const onFlush = vi.fn();
    const batcher = createDebouncedBatcher<string>(onFlush, 100);

    batcher.add("key1", "value1");
    batcher.flush();

    vi.advanceTimersByTime(100);

    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  test("clear() removes pending items and cancels timeout", () => {
    const onFlush = vi.fn();
    const batcher = createDebouncedBatcher<string>(onFlush, 100);

    batcher.add("key1", "value1");
    batcher.clear();

    vi.advanceTimersByTime(100);

    expect(onFlush).not.toHaveBeenCalled();
  });

  test("getTimeoutHandle() returns handle when timer is active", () => {
    const onFlush = vi.fn();
    const batcher = createDebouncedBatcher<string>(onFlush, 100);

    expect(batcher.getTimeoutHandle()).toBeNull();

    batcher.add("key1", "value1");

    expect(batcher.getTimeoutHandle()).not.toBeNull();
  });

  test("getTimeoutHandle() returns null after flush", () => {
    const onFlush = vi.fn();
    const batcher = createDebouncedBatcher<string>(onFlush, 100);

    batcher.add("key1", "value1");
    vi.advanceTimersByTime(100);

    expect(batcher.getTimeoutHandle()).toBeNull();
  });

  test("handles complex object values", () => {
    type Entity = { id: string; name: string };
    const onFlush = vi.fn();
    const batcher = createDebouncedBatcher<Entity>(onFlush, 100);

    batcher.add("entity-1", { id: "entity-1", name: "Test" });

    vi.advanceTimersByTime(100);

    expect(onFlush).toHaveBeenCalledWith(
      new Map([["entity-1", { id: "entity-1", name: "Test" }]]),
    );
  });

  test("clears pending items after flush", () => {
    const onFlush = vi.fn();
    const batcher = createDebouncedBatcher<string>(onFlush, 100);

    batcher.add("key1", "value1");
    vi.advanceTimersByTime(100);

    batcher.add("key2", "value2");
    vi.advanceTimersByTime(100);

    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(onFlush).toHaveBeenNthCalledWith(1, new Map([["key1", "value1"]]));
    expect(onFlush).toHaveBeenNthCalledWith(2, new Map([["key2", "value2"]]));
  });
});
