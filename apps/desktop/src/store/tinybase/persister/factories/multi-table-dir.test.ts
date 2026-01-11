import { beforeEach, describe, expect, test, vi } from "vitest";

import { createTestMainStore } from "../testing/mocks";
import { createMultiTableDirPersister } from "./multi-table-dir";

const path2Mocks = vi.hoisted(() => ({
  base: vi.fn().mockResolvedValue("/mock/data/dir/hyprnote"),
}));

const fsSyncMocks = vi.hoisted(() => ({
  deserialize: vi.fn(),
  serialize: vi.fn().mockResolvedValue({ status: "ok", data: "" }),
  writeDocumentBatch: vi.fn().mockResolvedValue({ status: "ok", data: null }),
  readDocumentBatch: vi.fn(),
  cleanupOrphan: vi.fn().mockResolvedValue({ status: "ok", data: 0 }),
}));

const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn(),
  remove: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@hypr/plugin-path2", () => ({ commands: path2Mocks }));
vi.mock("@hypr/plugin-fs-sync", () => ({ commands: fsSyncMocks }));
vi.mock("@tauri-apps/plugin-fs", () => fsMocks);

describe("createMultiTableDirPersister", () => {
  let store: ReturnType<typeof createTestMainStore>;

  beforeEach(() => {
    store = createTestMainStore();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createMultiTableDirPersister(store, {
      label: "TestPersister",
      dirName: "test",
      entityParser: () => null,
      tables: [{ tableName: "sessions", isPrimary: true }],
      cleanup: () => [],
      loadAll: async () => ({ sessions: {} }),
      loadSingle: async () => ({ sessions: {} }),
      save: () => ({ operations: [] }),
    });

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });
});
