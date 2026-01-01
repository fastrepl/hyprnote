import { exists, readTextFile, remove, rename } from "@tauri-apps/plugin-fs";
import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { SCHEMA } from "@hypr/store";

import { importFromFile, maybeImportFromJson } from "./importer";
import type { Store } from "./main";

vi.mock("@tauri-apps/plugin-fs", () => ({
  BaseDirectory: { Data: 0 },
  exists: vi.fn(),
  readTextFile: vi.fn(),
  remove: vi.fn(),
  rename: vi.fn(),
}));

vi.mock("@hypr/plugin-windows", () => ({
  getCurrentWebviewWindowLabel: vi.fn(),
}));

function createTestStore(): Store {
  return createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value) as Store;
}

describe("maybeImportFromJson", () => {
  let store: Store;
  let onPersistComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    store = createTestStore();
    onPersistComplete = vi.fn().mockResolvedValue(undefined);
  });

  test("returns skipped when not main window", async () => {
    vi.mocked(getCurrentWebviewWindowLabel).mockReturnValue("settings");

    const result = await maybeImportFromJson(store, onPersistComplete);

    expect(result).toEqual({ status: "skipped", reason: "not_main_window" });
    expect(exists).not.toHaveBeenCalled();
    expect(readTextFile).not.toHaveBeenCalled();
    expect(onPersistComplete).not.toHaveBeenCalled();
  });

  test("returns skipped when no import file exists", async () => {
    vi.mocked(getCurrentWebviewWindowLabel).mockReturnValue("main");
    vi.mocked(exists).mockResolvedValue(false);

    const result = await maybeImportFromJson(store, onPersistComplete);

    expect(result).toEqual({ status: "skipped", reason: "no_import_file" });
    expect(exists).toHaveBeenCalledTimes(2);
    expect(readTextFile).not.toHaveBeenCalled();
    expect(onPersistComplete).not.toHaveBeenCalled();
  });

  test("successfully imports from import.json", async () => {
    vi.mocked(getCurrentWebviewWindowLabel).mockReturnValue("main");
    vi.mocked(exists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    vi.mocked(rename).mockResolvedValue(undefined);
    vi.mocked(readTextFile).mockResolvedValue(
      JSON.stringify([
        {
          ai_providers: {
            test: { type: "llm", base_url: "url", api_key: "key" },
          },
        },
        { current_llm_provider: "test" },
      ]),
    );
    vi.mocked(remove).mockResolvedValue(undefined);

    const result = await maybeImportFromJson(store, onPersistComplete);

    expect(result).toEqual({
      status: "success",
      tablesImported: 1,
      valuesImported: 1,
    });
    expect(rename).toHaveBeenCalledWith(
      "hyprnote/import.json",
      "hyprnote/import.processing.json",
      { oldPathBaseDir: 0, newPathBaseDir: 0 },
    );
    expect(onPersistComplete).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("hyprnote/import.processing.json", {
      baseDir: 0,
    });
  });

  test("resumes from processing file if import.json missing", async () => {
    vi.mocked(getCurrentWebviewWindowLabel).mockReturnValue("main");
    vi.mocked(exists).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    vi.mocked(readTextFile).mockResolvedValue(JSON.stringify([{}, {}]));
    vi.mocked(remove).mockResolvedValue(undefined);

    const result = await maybeImportFromJson(store, onPersistComplete);

    expect(result.status).toBe("success");
    expect(rename).not.toHaveBeenCalled();
    expect(readTextFile).toHaveBeenCalled();
  });

  test("returns error for invalid JSON format - not array", async () => {
    vi.mocked(getCurrentWebviewWindowLabel).mockReturnValue("main");
    vi.mocked(exists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    vi.mocked(rename).mockResolvedValue(undefined);
    vi.mocked(readTextFile).mockResolvedValue("{}");

    const result = await maybeImportFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toContain(
      "expected [tables, values] array",
    );
    expect(onPersistComplete).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  test("returns error for invalid JSON format - wrong array length", async () => {
    vi.mocked(getCurrentWebviewWindowLabel).mockReturnValue("main");
    vi.mocked(exists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    vi.mocked(rename).mockResolvedValue(undefined);
    vi.mocked(readTextFile).mockResolvedValue("[1, 2, 3]");

    const result = await maybeImportFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toContain(
      "expected [tables, values] array",
    );
  });

  test("returns error when tables is not object or null", async () => {
    vi.mocked(getCurrentWebviewWindowLabel).mockReturnValue("main");
    vi.mocked(exists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    vi.mocked(rename).mockResolvedValue(undefined);
    vi.mocked(readTextFile).mockResolvedValue('["invalid", {}]');

    const result = await maybeImportFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toContain(
      "tables must be an object or null",
    );
  });

  test("returns error when values is not object or null", async () => {
    vi.mocked(getCurrentWebviewWindowLabel).mockReturnValue("main");
    vi.mocked(exists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    vi.mocked(rename).mockResolvedValue(undefined);
    vi.mocked(readTextFile).mockResolvedValue('[{}, "invalid"]');

    const result = await maybeImportFromJson(store, onPersistComplete);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toContain(
      "values must be an object or null",
    );
  });

  test("handles null tables and values", async () => {
    vi.mocked(getCurrentWebviewWindowLabel).mockReturnValue("main");
    vi.mocked(exists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    vi.mocked(rename).mockResolvedValue(undefined);
    vi.mocked(readTextFile).mockResolvedValue("[null, null]");
    vi.mocked(remove).mockResolvedValue(undefined);

    const result = await maybeImportFromJson(store, onPersistComplete);

    expect(result).toEqual({
      status: "success",
      tablesImported: 0,
      valuesImported: 0,
    });
  });

  test("remove is called only after onPersistComplete resolves", async () => {
    vi.mocked(getCurrentWebviewWindowLabel).mockReturnValue("main");
    vi.mocked(exists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    vi.mocked(rename).mockResolvedValue(undefined);
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

    await maybeImportFromJson(store, deferredPersist);

    expect(deferredPersist).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe("importFromFile", () => {
  let store: Store;
  let onPersistComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    store = createTestStore();
    onPersistComplete = vi.fn().mockResolvedValue(undefined);
  });

  test("successfully imports from file", async () => {
    vi.mocked(readTextFile).mockResolvedValue(
      JSON.stringify([
        {
          ai_providers: {
            openai: { type: "llm", base_url: "url", api_key: "key" },
          },
        },
        { current_llm_provider: "openai" },
      ]),
    );

    const result = await importFromFile(
      store,
      "/path/to/import.json",
      onPersistComplete,
    );

    expect(result).toEqual({
      status: "success",
      tablesImported: 1,
      valuesImported: 1,
    });
    expect(readTextFile).toHaveBeenCalledWith("/path/to/import.json");
    expect(onPersistComplete).toHaveBeenCalledTimes(1);
    expect(rename).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(exists).not.toHaveBeenCalled();
  });

  test("returns error for invalid JSON", async () => {
    vi.mocked(readTextFile).mockResolvedValue("not valid json");

    const result = await importFromFile(
      store,
      "/path/to/import.json",
      onPersistComplete,
    );

    expect(result.status).toBe("error");
    expect(onPersistComplete).not.toHaveBeenCalled();
  });

  test("returns error for wrong format", async () => {
    vi.mocked(readTextFile).mockResolvedValue("{}");

    const result = await importFromFile(
      store,
      "/path/to/import.json",
      onPersistComplete,
    );

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toContain(
      "expected [tables, values] array",
    );
  });

  test("merges data into existing store", async () => {
    store.setValues({ current_llm_provider: "existing" });

    vi.mocked(readTextFile).mockResolvedValue(
      JSON.stringify([{}, { current_stt_provider: "new" }]),
    );

    const result = await importFromFile(
      store,
      "/path/to/import.json",
      onPersistComplete,
    );

    expect(result.status).toBe("success");
    expect(store.getValue("current_llm_provider")).toBe("existing");
    expect(store.getValue("current_stt_provider")).toBe("new");
  });

  test("handles file read error", async () => {
    vi.mocked(readTextFile).mockRejectedValue(new Error("File not found"));

    const result = await importFromFile(
      store,
      "/path/to/nonexistent.json",
      onPersistComplete,
    );

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toBe("File not found");
    expect(onPersistComplete).not.toHaveBeenCalled();
  });
});
