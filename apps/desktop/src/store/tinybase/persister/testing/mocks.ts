import { createMergeableStore } from "tinybase/with-schemas";
import { vi } from "vitest";

import { SCHEMA } from "@hypr/store";

import {
  SCHEMA as SETTINGS_SCHEMA,
  type Store as SettingsStore,
} from "../../store/settings";

export const MOCK_DATA_DIR = "/mock/data/dir/hyprnote";

export const TEST_UUID_1 = "550e8400-e29b-41d4-a716-446655440000";
export const TEST_UUID_2 = "550e8400-e29b-41d4-a716-446655440001";

export function createTestMainStore() {
  return createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value);
}

export function createTestSettingsStore(): SettingsStore {
  return createMergeableStore()
    .setTablesSchema(SETTINGS_SCHEMA.table)
    .setValuesSchema(SETTINGS_SCHEMA.value) as SettingsStore;
}

export function setupJsonFilePersisterMocks() {
  vi.mock("@hypr/plugin-path2", () => ({
    commands: {
      base: vi.fn().mockResolvedValue(MOCK_DATA_DIR),
    },
  }));

  vi.mock("@tauri-apps/plugin-fs", () => ({
    mkdir: vi.fn().mockResolvedValue(undefined),
    readTextFile: vi.fn(),
    writeTextFile: vi.fn().mockResolvedValue(undefined),
  }));
}

export function setupMarkdownDirPersisterMocks() {
  vi.mock("@hypr/plugin-path2", () => ({
    commands: {
      base: vi.fn().mockResolvedValue(MOCK_DATA_DIR),
    },
  }));

  vi.mock("@hypr/plugin-fs-sync", () => ({
    commands: {
      deserialize: vi.fn(),
      serialize: vi.fn().mockResolvedValue({ status: "ok", data: "" }),
      writeDocumentBatch: vi
        .fn()
        .mockResolvedValue({ status: "ok", data: null }),
      readDocumentBatch: vi.fn(),
      cleanupOrphan: vi.fn().mockResolvedValue({ status: "ok", data: 0 }),
    },
  }));

  vi.mock("@tauri-apps/plugin-fs", () => ({
    mkdir: vi.fn().mockResolvedValue(undefined),
    readDir: vi.fn(),
    readTextFile: vi.fn(),
    writeTextFile: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn(),
    remove: vi.fn().mockResolvedValue(undefined),
  }));
}
