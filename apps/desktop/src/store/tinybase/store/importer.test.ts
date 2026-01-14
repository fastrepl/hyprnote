import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { commands as fs2Commands } from "@hypr/plugin-fs2";
import { commands as path2Commands } from "@hypr/plugin-path2";
import { SCHEMA } from "@hypr/store";

import { importFromJson } from "./importer";
import type { Store } from "./main";

vi.mock("@tauri-apps/api/path", () => ({
  sep: vi.fn(() => "/"),
}));

vi.mock("@hypr/plugin-path2", () => ({
  commands: {
    base: vi.fn().mockResolvedValue("/test/data"),
  },
}));

vi.mock("@hypr/plugin-fs2", () => ({
  commands: {
    readTextFile: vi.fn(),
    remove: vi.fn(),
  },
}));

function createTestStore(): Store {
  return createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value) as Store;
}

describe("importFromJson", () => {
  let store: Store;
  let onPersistComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(path2Commands.base).mockResolvedValue("/test/data");
    store = createTestStore();
    onPersistComplete = vi.fn().mockResolvedValue(undefined);
  });

  test("successfully imports data", async () => {
    vi.mocked(fs2Commands.readTextFile).mockResolvedValue({
      status: "ok",
      data: JSON.stringify([
        {
          folders: {
            "folder-1": {
              user_id: "user",
              created_at: "2024-01-01",
              name: "Test",
            },
          },
        },
        {},
      ]),
    });
    vi.mocked(fs2Commands.remove).mockResolvedValue({
      status: "ok",
      data: null,
    });

    const result = await importFromJson(store, onPersistComplete);

    expect(result).toEqual({
      status: "success",
      rowsImported: 1,
      valuesImported: 0,
    });
    expect(fs2Commands.readTextFile).toHaveBeenCalledWith(
      "/test/data/import.json",
    );
    expect(onPersistComplete).toHaveBeenCalledTimes(1);
    expect(fs2Commands.remove).toHaveBeenCalledWith("/test/data/import.json");
  });

  test("returns error for invalid JSON format - not array", async () => {
    vi.mocked(fs2Commands.readTextFile).mockResolvedValue({
      status: "ok",
      data: "{}",
    });

    const result = await importFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toContain(
      "expected [tables, values] array",
    );
    expect(onPersistComplete).not.toHaveBeenCalled();
    expect(fs2Commands.remove).not.toHaveBeenCalled();
  });

  test("returns error for invalid JSON format - wrong array length", async () => {
    vi.mocked(fs2Commands.readTextFile).mockResolvedValue({
      status: "ok",
      data: "[1, 2, 3]",
    });

    const result = await importFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toContain(
      "expected [tables, values] array",
    );
  });

  test("returns error when tables is not object or null", async () => {
    vi.mocked(fs2Commands.readTextFile).mockResolvedValue({
      status: "ok",
      data: '["invalid", {}]',
    });

    const result = await importFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toContain(
      "tables must be an object or null",
    );
  });

  test("returns error when values is not object or null", async () => {
    vi.mocked(fs2Commands.readTextFile).mockResolvedValue({
      status: "ok",
      data: '[{}, "invalid"]',
    });

    const result = await importFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toContain(
      "values must be an object or null",
    );
  });

  test("handles null tables and values", async () => {
    vi.mocked(fs2Commands.readTextFile).mockResolvedValue({
      status: "ok",
      data: "[null, null]",
    });
    vi.mocked(fs2Commands.remove).mockResolvedValue({
      status: "ok",
      data: null,
    });

    const result = await importFromJson(store, onPersistComplete);

    expect(result).toEqual({
      status: "success",
      rowsImported: 0,
      valuesImported: 0,
    });
  });

  test("merges data into existing store", async () => {
    store.setValues({ current_llm_provider: "existing" });

    vi.mocked(fs2Commands.readTextFile).mockResolvedValue({
      status: "ok",
      data: JSON.stringify([{}, { current_stt_provider: "new" }]),
    });
    vi.mocked(fs2Commands.remove).mockResolvedValue({
      status: "ok",
      data: null,
    });

    const result = await importFromJson(store, onPersistComplete);

    expect(result.status).toBe("success");
    expect(store.getValue("current_llm_provider")).toBe("existing");
    expect(store.getValue("current_stt_provider")).toBe("new");
  });

  test("handles file read error", async () => {
    vi.mocked(fs2Commands.readTextFile).mockResolvedValue({
      status: "error",
      error: "File not found",
    });

    const result = await importFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toBe("File not found");
    expect(onPersistComplete).not.toHaveBeenCalled();
  });

  test("remove is called only after onPersistComplete resolves", async () => {
    vi.mocked(fs2Commands.readTextFile).mockResolvedValue({
      status: "ok",
      data: "[{}, {}]",
    });
    vi.mocked(fs2Commands.remove).mockResolvedValue({
      status: "ok",
      data: null,
    });

    let persistCompleted = false;
    const deferredPersist = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      persistCompleted = true;
    });

    vi.mocked(fs2Commands.remove).mockImplementation(async () => {
      expect(persistCompleted).toBe(true);
      return { status: "ok", data: null };
    });

    await importFromJson(store, deferredPersist);

    expect(deferredPersist).toHaveBeenCalledTimes(1);
    expect(fs2Commands.remove).toHaveBeenCalledTimes(1);
  });
});
