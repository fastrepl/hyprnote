import { readTextFile, remove } from "@tauri-apps/plugin-fs";
import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA } from "@hypr/store";

import { importFromJson } from "./importer";
import type { Store } from "./main";

vi.mock("@tauri-apps/plugin-fs", () => ({
  BaseDirectory: { Data: 0 },
  readTextFile: vi.fn(),
  remove: vi.fn(),
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
    vi.resetAllMocks();
    store = createTestStore();
    onPersistComplete = vi.fn().mockResolvedValue(undefined);
  });

  test("successfully imports data", async () => {
    vi.mocked(readTextFile).mockResolvedValue(
      JSON.stringify([
        {
          sessions: {
            "session-1": {
              user_id: "user",
              created_at: "2024-01-01",
              title: "Test Session",
            },
          },
        },
        {},
      ]),
    );
    vi.mocked(remove).mockResolvedValue(undefined);

    const result = await importFromJson(store, onPersistComplete);

    expect(result).toEqual({
      status: "success",
      rowsImported: 1,
      valuesImported: 0,
    });
    expect(readTextFile).toHaveBeenCalledWith("hyprnote/import.json", {
      baseDir: 0,
    });
    expect(onPersistComplete).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("hyprnote/import.json", { baseDir: 0 });
  });

  test("returns error for invalid JSON format - not array", async () => {
    vi.mocked(readTextFile).mockResolvedValue("{}");

    const result = await importFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toContain(
      "expected [tables, values] array",
    );
    expect(onPersistComplete).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  test("returns error for invalid JSON format - wrong array length", async () => {
    vi.mocked(readTextFile).mockResolvedValue("[1, 2, 3]");

    const result = await importFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toContain(
      "expected [tables, values] array",
    );
  });

  test("returns error when tables is not object or null", async () => {
    vi.mocked(readTextFile).mockResolvedValue('["invalid", {}]');

    const result = await importFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toContain(
      "tables must be an object or null",
    );
  });

  test("returns error when values is not object or null", async () => {
    vi.mocked(readTextFile).mockResolvedValue('[{}, "invalid"]');

    const result = await importFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toContain(
      "values must be an object or null",
    );
  });

  test("handles null tables and values", async () => {
    vi.mocked(readTextFile).mockResolvedValue("[null, null]");
    vi.mocked(remove).mockResolvedValue(undefined);

    const result = await importFromJson(store, onPersistComplete);

    expect(result).toEqual({
      status: "success",
      rowsImported: 0,
      valuesImported: 0,
    });
  });

  test("merges data into existing store", async () => {
    store.setValues({ current_llm_provider: "existing" });

    vi.mocked(readTextFile).mockResolvedValue(
      JSON.stringify([{}, { current_stt_provider: "new" }]),
    );
    vi.mocked(remove).mockResolvedValue(undefined);

    const result = await importFromJson(store, onPersistComplete);

    expect(result.status).toBe("success");
    expect(store.getValue("current_llm_provider")).toBe("existing");
    expect(store.getValue("current_stt_provider")).toBe("new");
  });

  test("handles file read error", async () => {
    vi.mocked(readTextFile).mockRejectedValue(new Error("File not found"));

    const result = await importFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toBe("File not found");
    expect(onPersistComplete).not.toHaveBeenCalled();
  });

  test("remove is called only after onPersistComplete resolves", async () => {
    vi.mocked(readTextFile).mockResolvedValue("[{}, {}]");
    vi.mocked(remove).mockResolvedValue(undefined);

    let persistCompleted = false;
    const deferredPersist = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      persistCompleted = true;
    });

    vi.mocked(remove).mockImplementation(async () => {
      expect(persistCompleted).toBe(true);
    });

    await importFromJson(store, deferredPersist);

    expect(deferredPersist).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
