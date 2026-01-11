import { describe, expect, test } from "vitest";

import {
  createDeletionMarker,
  type DeletionMarkerStore,
  type RuntimeTableConfig,
} from "./deletion-marker";

type TestData = {
  sessions: Record<string, { title: string; folder_id: string }>;
  words: Record<string, { session_id: string; text: string }>;
  events: Record<string, { name: string }>;
};

function createMockStore(tables: Partial<TestData> = {}): DeletionMarkerStore {
  return {
    getTable: (tableName: string) =>
      tables[tableName as keyof TestData] as
        | Record<string, Record<string, unknown>>
        | undefined,
    getRow: (tableName: string, rowId: string) =>
      tables[tableName as keyof TestData]?.[rowId] as
        | Record<string, unknown>
        | undefined,
  };
}

describe("createDeletionMarker", () => {
  describe("markAll", () => {
    test("returns loaded data when store is empty", () => {
      const store = createMockStore({});
      const configs: RuntimeTableConfig[] = [
        { tableName: "sessions", isPrimary: true },
      ];
      const marker = createDeletionMarker<TestData>(store, configs);

      const loaded = {
        sessions: {
          "session-1": { title: "Test", folder_id: "folder-1" },
        },
        words: {},
        events: {},
      };

      const result = marker.markAll(loaded);

      expect(result.sessions).toEqual({
        "session-1": { title: "Test", folder_id: "folder-1" },
      });
    });

    test("marks rows for deletion that exist in store but not in loaded data", () => {
      const store = createMockStore({
        sessions: {
          "session-1": { title: "Existing", folder_id: "folder-1" },
          "session-2": { title: "ToDelete", folder_id: "folder-1" },
        },
      });
      const configs: RuntimeTableConfig[] = [
        { tableName: "sessions", isPrimary: true },
      ];
      const marker = createDeletionMarker<TestData>(store, configs);

      const loaded = {
        sessions: {
          "session-1": { title: "Updated", folder_id: "folder-1" },
        },
        words: {},
        events: {},
      };

      const result = marker.markAll(loaded);

      expect(result.sessions["session-1"]).toEqual({
        title: "Updated",
        folder_id: "folder-1",
      });
      expect(result.sessions["session-2"]).toBeUndefined();
      expect("session-2" in result.sessions).toBe(true);
    });

    test("handles multiple tables independently", () => {
      const store = createMockStore({
        sessions: {
          "session-1": { title: "Session", folder_id: "f1" },
        },
        words: {
          "word-1": { session_id: "session-1", text: "hello" },
        },
      });
      const configs: RuntimeTableConfig[] = [
        { tableName: "sessions", isPrimary: true },
        { tableName: "words", foreignKey: "session_id" },
      ];
      const marker = createDeletionMarker<TestData>(store, configs);

      const loaded = {
        sessions: {},
        words: {},
        events: {},
      };

      const result = marker.markAll(loaded);

      expect(result.sessions["session-1"]).toBeUndefined();
      expect("session-1" in result.sessions).toBe(true);
      expect(result.words["word-1"]).toBeUndefined();
      expect("word-1" in result.words).toBe(true);
    });

    test("handles empty loaded data", () => {
      const store = createMockStore({
        sessions: {
          "session-1": { title: "ToDelete", folder_id: "f1" },
        },
      });
      const configs: RuntimeTableConfig[] = [
        { tableName: "sessions", isPrimary: true },
      ];
      const marker = createDeletionMarker<TestData>(store, configs);

      const loaded = {
        sessions: {},
        words: {},
        events: {},
      };

      const result = marker.markAll(loaded);

      expect(result.sessions["session-1"]).toBeUndefined();
      expect("session-1" in result.sessions).toBe(true);
    });

    test("handles undefined loaded table", () => {
      const store = createMockStore({
        sessions: {
          "session-1": { title: "Test", folder_id: "f1" },
        },
      });
      const configs: RuntimeTableConfig[] = [
        { tableName: "sessions", isPrimary: true },
      ];
      const marker = createDeletionMarker<TestData>(store, configs);

      const loaded = {} as TestData;

      const result = marker.markAll(loaded);

      expect(result.sessions["session-1"]).toBeUndefined();
      expect("session-1" in result.sessions).toBe(true);
    });

    test("preserves all loaded rows even when not in store", () => {
      const store = createMockStore({});
      const configs: RuntimeTableConfig[] = [
        { tableName: "sessions", isPrimary: true },
      ];
      const marker = createDeletionMarker<TestData>(store, configs);

      const loaded = {
        sessions: {
          "new-1": { title: "New1", folder_id: "f1" },
          "new-2": { title: "New2", folder_id: "f1" },
        },
        words: {},
        events: {},
      };

      const result = marker.markAll(loaded);

      expect(result.sessions).toEqual({
        "new-1": { title: "New1", folder_id: "f1" },
        "new-2": { title: "New2", folder_id: "f1" },
      });
    });
  });

  describe("markForEntity", () => {
    describe("primary table behavior", () => {
      test("marks only the specific entity for deletion in primary table", () => {
        const store = createMockStore({
          sessions: {
            "session-1": { title: "Session1", folder_id: "f1" },
            "session-2": { title: "Session2", folder_id: "f1" },
          },
        });
        const configs: RuntimeTableConfig[] = [
          { tableName: "sessions", isPrimary: true },
        ];
        const marker = createDeletionMarker<TestData>(store, configs);

        const loaded = {
          sessions: {},
          words: {},
          events: {},
        };

        const result = marker.markForEntity(loaded, "session-1");

        expect(result.sessions["session-1"]).toBeUndefined();
        expect("session-1" in result.sessions).toBe(true);
        expect("session-2" in result.sessions).toBe(false);
      });

      test("preserves loaded data for entity that exists", () => {
        const store = createMockStore({
          sessions: {
            "session-1": { title: "OldTitle", folder_id: "f1" },
          },
        });
        const configs: RuntimeTableConfig[] = [
          { tableName: "sessions", isPrimary: true },
        ];
        const marker = createDeletionMarker<TestData>(store, configs);

        const loaded = {
          sessions: {
            "session-1": { title: "NewTitle", folder_id: "f1" },
          },
          words: {},
          events: {},
        };

        const result = marker.markForEntity(loaded, "session-1");

        expect(result.sessions["session-1"]).toEqual({
          title: "NewTitle",
          folder_id: "f1",
        });
      });

      test("does not mark entity when it does not exist in store", () => {
        const store = createMockStore({});
        const configs: RuntimeTableConfig[] = [
          { tableName: "sessions", isPrimary: true },
        ];
        const marker = createDeletionMarker<TestData>(store, configs);

        const loaded = {
          sessions: {},
          words: {},
          events: {},
        };

        const result = marker.markForEntity(loaded, "nonexistent");

        expect(Object.keys(result.sessions)).toHaveLength(0);
      });
    });

    describe("foreign key table behavior", () => {
      test("marks rows with matching foreign key for deletion", () => {
        const store = createMockStore({
          words: {
            "word-1": { session_id: "session-1", text: "hello" },
            "word-2": { session_id: "session-1", text: "world" },
            "word-3": { session_id: "session-2", text: "other" },
          },
        });
        const configs: RuntimeTableConfig[] = [
          { tableName: "words", foreignKey: "session_id" },
        ];
        const marker = createDeletionMarker<TestData>(store, configs);

        const loaded = {
          sessions: {},
          words: {},
          events: {},
        };

        const result = marker.markForEntity(loaded, "session-1");

        expect(result.words["word-1"]).toBeUndefined();
        expect("word-1" in result.words).toBe(true);
        expect(result.words["word-2"]).toBeUndefined();
        expect("word-2" in result.words).toBe(true);
        expect("word-3" in result.words).toBe(false);
      });

      test("preserves loaded rows with matching foreign key", () => {
        const store = createMockStore({
          words: {
            "word-1": { session_id: "session-1", text: "old" },
            "word-2": { session_id: "session-1", text: "toDelete" },
          },
        });
        const configs: RuntimeTableConfig[] = [
          { tableName: "words", foreignKey: "session_id" },
        ];
        const marker = createDeletionMarker<TestData>(store, configs);

        const loaded = {
          sessions: {},
          words: {
            "word-1": { session_id: "session-1", text: "updated" },
          },
          events: {},
        };

        const result = marker.markForEntity(loaded, "session-1");

        expect(result.words["word-1"]).toEqual({
          session_id: "session-1",
          text: "updated",
        });
        expect(result.words["word-2"]).toBeUndefined();
        expect("word-2" in result.words).toBe(true);
      });

      test("does not mark rows with different foreign key", () => {
        const store = createMockStore({
          words: {
            "word-1": { session_id: "session-2", text: "different" },
          },
        });
        const configs: RuntimeTableConfig[] = [
          { tableName: "words", foreignKey: "session_id" },
        ];
        const marker = createDeletionMarker<TestData>(store, configs);

        const loaded = {
          sessions: {},
          words: {},
          events: {},
        };

        const result = marker.markForEntity(loaded, "session-1");

        expect("word-1" in result.words).toBe(false);
      });
    });

    describe("table without relationship config", () => {
      test("returns loaded data unchanged for unconfigured tables", () => {
        const store = createMockStore({
          events: {
            "event-1": { name: "Existing" },
          },
        });
        const configs: RuntimeTableConfig[] = [{ tableName: "events" }];
        const marker = createDeletionMarker<TestData>(store, configs);

        const loaded = {
          sessions: {},
          words: {},
          events: {
            "event-2": { name: "Loaded" },
          },
        };

        const result = marker.markForEntity(loaded, "any-entity");

        expect(result.events).toEqual({
          "event-2": { name: "Loaded" },
        });
        expect("event-1" in result.events).toBe(false);
      });
    });

    describe("combined table configurations", () => {
      test("handles primary, foreign key, and unconfigured tables together", () => {
        const store = createMockStore({
          sessions: {
            "session-1": { title: "Session1", folder_id: "f1" },
            "session-2": { title: "Session2", folder_id: "f1" },
          },
          words: {
            "word-1": { session_id: "session-1", text: "hello" },
            "word-2": { session_id: "session-2", text: "other" },
          },
          events: {
            "event-1": { name: "Event" },
          },
        });
        const configs: RuntimeTableConfig[] = [
          { tableName: "sessions", isPrimary: true },
          { tableName: "words", foreignKey: "session_id" },
          { tableName: "events" },
        ];
        const marker = createDeletionMarker<TestData>(store, configs);

        const loaded = {
          sessions: {},
          words: {},
          events: {
            "event-new": { name: "New Event" },
          },
        };

        const result = marker.markForEntity(loaded, "session-1");

        expect(result.sessions["session-1"]).toBeUndefined();
        expect("session-1" in result.sessions).toBe(true);
        expect("session-2" in result.sessions).toBe(false);

        expect(result.words["word-1"]).toBeUndefined();
        expect("word-1" in result.words).toBe(true);
        expect("word-2" in result.words).toBe(false);

        expect(result.events).toEqual({ "event-new": { name: "New Event" } });
      });
    });
  });

  describe("edge cases", () => {
    test("handles empty configs array", () => {
      const store = createMockStore({
        sessions: { s1: { title: "Test", folder_id: "f1" } },
      });
      const configs: RuntimeTableConfig[] = [];
      const marker = createDeletionMarker<TestData>(store, configs);

      const loaded = { sessions: {}, words: {}, events: {} };

      const markAllResult = marker.markAll(loaded);
      expect(markAllResult).toEqual({});

      const markForEntityResult = marker.markForEntity(loaded, "s1");
      expect(markForEntityResult).toEqual({});
    });

    test("handles store with undefined table", () => {
      const store = createMockStore({});
      const configs: RuntimeTableConfig[] = [
        { tableName: "sessions", isPrimary: true },
      ];
      const marker = createDeletionMarker<TestData>(store, configs);

      const loaded = {
        sessions: { s1: { title: "New", folder_id: "f1" } },
        words: {},
        events: {},
      };

      const result = marker.markAll(loaded);

      expect(result.sessions).toEqual({
        s1: { title: "New", folder_id: "f1" },
      });
    });

    test("handles row that exists in loaded but not in store for foreign key check", () => {
      const store = createMockStore({});
      const configs: RuntimeTableConfig[] = [
        { tableName: "words", foreignKey: "session_id" },
      ];
      const marker = createDeletionMarker<TestData>(store, configs);

      const loaded = {
        sessions: {},
        words: {
          "word-new": { session_id: "session-1", text: "new" },
        },
        events: {},
      };

      const result = marker.markForEntity(loaded, "session-1");

      expect(result.words).toEqual({
        "word-new": { session_id: "session-1", text: "new" },
      });
    });
  });
});
