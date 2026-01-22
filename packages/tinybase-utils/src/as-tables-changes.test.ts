import { createMergeableStore } from "tinybase";
import { createCustomPersister } from "tinybase/persisters";
import { beforeEach, describe, expect, test } from "vitest";

import {
  asTablesChanges,
  toContent,
  toPersistedChanges,
} from "./as-tables-changes";

const MergeableStoreOnly = 2;

describe("asTablesChanges", () => {
  describe("e2e: applying changes to store", () => {
    let store: ReturnType<typeof createMergeableStore>;

    beforeEach(() => {
      store = createMergeableStore("test-store");
    });

    test("wraps tables for merging into store without wiping other tables", async () => {
      store.setCell("users", "user-1", "name", "Alice");
      store.setCell("sessions", "session-1", "title", "Original");

      const changes = asTablesChanges({
        sessions: {
          "session-1": { title: "Updated" },
          "session-2": { title: "New Session" },
        },
      });

      const persister = createCustomPersister(
        store,
        async () => changes,
        async () => {},
        () => null,
        () => {},
        undefined,
        MergeableStoreOnly,
      );
      await persister.load();

      expect(store.getCell("sessions", "session-1", "title")).toBe("Updated");
      expect(store.getCell("sessions", "session-2", "title")).toBe(
        "New Session",
      );
      expect(store.getCell("users", "user-1", "name")).toBe("Alice");
    });

    test("handles deletion markers for rows", async () => {
      store.setCell("sessions", "session-1", "title", "To Delete");
      store.setCell("sessions", "session-2", "title", "Keep This");

      const changes = asTablesChanges({
        sessions: { "session-1": undefined },
      });

      const persister = createCustomPersister(
        store,
        async () => changes,
        async () => {},
        () => null,
        () => {},
        undefined,
        MergeableStoreOnly,
      );
      await persister.load();

      expect(store.getRow("sessions", "session-1")).toEqual({});
      expect(store.getCell("sessions", "session-2", "title")).toBe("Keep This");
    });

    test("handles multiple tables in single change", async () => {
      store.setCell("existing", "row-1", "value", "keep");

      const changes = asTablesChanges({
        sessions: { s1: { title: "Session 1" } },
        users: { u1: { name: "Alice" } },
        posts: { p1: { content: "Hello" } },
      });

      const persister = createCustomPersister(
        store,
        async () => changes,
        async () => {},
        () => null,
        () => {},
        undefined,
        MergeableStoreOnly,
      );
      await persister.load();

      expect(store.getCell("sessions", "s1", "title")).toBe("Session 1");
      expect(store.getCell("users", "u1", "name")).toBe("Alice");
      expect(store.getCell("posts", "p1", "content")).toBe("Hello");
      expect(store.getCell("existing", "row-1", "value")).toBe("keep");
    });

    test("handles empty tables", async () => {
      store.setCell("sessions", "s1", "title", "Existing");

      const changes = asTablesChanges({
        newTable: {},
      });

      const persister = createCustomPersister(
        store,
        async () => changes,
        async () => {},
        () => null,
        () => {},
        undefined,
        MergeableStoreOnly,
      );
      await persister.load();

      expect(store.getCell("sessions", "s1", "title")).toBe("Existing");
      expect(store.getTables()).toHaveProperty("sessions");
    });

    test("handles nested cell values as JSON strings", async () => {
      const metadata = { nested: { deep: { value: 123 } } };
      const changes = asTablesChanges({
        sessions: {
          s1: {
            title: "Test",
            metadata: JSON.stringify(metadata),
          },
        },
      });

      const persister = createCustomPersister(
        store,
        async () => changes,
        async () => {},
        () => null,
        () => {},
        undefined,
        MergeableStoreOnly,
      );
      await persister.load();

      expect(store.getCell("sessions", "s1", "title")).toBe("Test");
      expect(
        JSON.parse(store.getCell("sessions", "s1", "metadata") as string),
      ).toEqual(metadata);
    });

    test("returns tuple with empty values object and flag 1", () => {
      const tables = { sessions: { s1: { title: "Test" } } };
      const result = asTablesChanges(tables);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(tables);
      expect(result[1]).toEqual({});
      expect(result[2]).toBe(1);
    });

    test("handles cell-level deletion markers", async () => {
      store.transaction(() => {
        store.setCell("sessions", "s1", "title", "Title");
        store.setCell("sessions", "s1", "description", "Description");
      });

      const changes = asTablesChanges({
        sessions: { s1: { description: undefined } },
      });

      const persister = createCustomPersister(
        store,
        async () => changes,
        async () => {},
        () => null,
        () => {},
        undefined,
        MergeableStoreOnly,
      );
      await persister.load();

      expect(store.getCell("sessions", "s1", "title")).toBe("Title");
      expect(store.getCell("sessions", "s1", "description")).toBeUndefined();
    });

    test("handles multiple rows with different data types", async () => {
      const changes = asTablesChanges({
        items: {
          "item-1": { name: "String", count: 42, active: true },
          "item-2": { name: "Another", count: 0, active: false },
          "item-3": { name: "", count: -10, active: true },
        },
      });

      const persister = createCustomPersister(
        store,
        async () => changes,
        async () => {},
        () => null,
        () => {},
        undefined,
        MergeableStoreOnly,
      );
      await persister.load();

      expect(store.getCell("items", "item-1", "name")).toBe("String");
      expect(store.getCell("items", "item-1", "count")).toBe(42);
      expect(store.getCell("items", "item-1", "active")).toBe(true);
      expect(store.getCell("items", "item-2", "count")).toBe(0);
      expect(store.getCell("items", "item-2", "active")).toBe(false);
      expect(store.getCell("items", "item-3", "name")).toBe("");
      expect(store.getCell("items", "item-3", "count")).toBe(-10);
    });
  });
});

describe("toPersistedChanges", () => {
  describe("e2e: applying persisted changes to store", () => {
    let store: ReturnType<typeof createMergeableStore>;

    beforeEach(() => {
      store = createMergeableStore("test-store");
    });

    test("converts tables to PersistedChanges type for use with persisters", async () => {
      store.setCell("existing", "row-1", "value", "keep");

      const changes = toPersistedChanges({
        sessions: { "session-1": { title: "Test" } },
      });

      const persister = createCustomPersister(
        store,
        async () => changes,
        async () => {},
        () => null,
        () => {},
        undefined,
        MergeableStoreOnly,
      );
      await persister.load();

      expect(store.getCell("sessions", "session-1", "title")).toBe("Test");
      expect(store.getCell("existing", "row-1", "value")).toBe("keep");
    });

    test("maintains the same structure as asTablesChanges", () => {
      const tables = { users: { u1: { name: "Alice" } } };

      const asChanges = asTablesChanges(tables);
      const persisted = toPersistedChanges(tables);

      expect(persisted).toEqual(asChanges);
    });
  });
});

describe("toContent", () => {
  describe("e2e: applying content to store", () => {
    let store: ReturnType<typeof createMergeableStore>;

    beforeEach(() => {
      store = createMergeableStore("test-store");
    });

    test("converts tables to Content type for use with TinyBase", async () => {
      store.setCell("existing", "row-1", "value", "keep");

      const content = toContent({
        sessions: { "session-1": { title: "Test" } },
      });

      const persister = createCustomPersister(
        store,
        async () => content,
        async () => {},
        () => null,
        () => {},
        undefined,
        MergeableStoreOnly,
      );
      await persister.load();

      expect(store.getCell("sessions", "session-1", "title")).toBe("Test");
      expect(store.getCell("existing", "row-1", "value")).toBe("keep");
    });

    test("maintains the same structure as asTablesChanges", () => {
      const tables = { users: { u1: { name: "Alice" } } };

      const asChanges = asTablesChanges(tables);
      const content = toContent(tables);

      expect(content).toEqual(asChanges);
    });
  });
});
