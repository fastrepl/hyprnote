import { createMergeableStore } from "tinybase";
import { beforeEach, describe, expect, test } from "vitest";

import type { GenericTablesContent } from "./iterate-table-rows";
import { iterateTableRows } from "./iterate-table-rows";

describe("iterateTableRows", () => {
  describe("e2e: mutate store and iterate", () => {
    let store: ReturnType<typeof createMergeableStore>;

    beforeEach(() => {
      store = createMergeableStore("test-store");
    });

    test("iterates over rows from store content and adds id field", () => {
      store.transaction(() => {
        store.setCell("sessions", "session-1", "title", "Meeting Notes");
        store.setCell("sessions", "session-1", "created_at", "2024-01-01");
        store.setCell("sessions", "session-2", "title", "Project Plan");
        store.setCell("sessions", "session-2", "created_at", "2024-01-02");
      });

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "sessions");

      expect(rows).toHaveLength(2);
      expect(rows.find((r) => r.id === "session-1")).toMatchObject({
        id: "session-1",
        title: "Meeting Notes",
        created_at: "2024-01-01",
      });
      expect(rows.find((r) => r.id === "session-2")).toMatchObject({
        id: "session-2",
        title: "Project Plan",
        created_at: "2024-01-02",
      });
    });

    test("handles mixed tables without interfering", () => {
      store.transaction(() => {
        store.setCell("sessions", "s1", "title", "Session");
        store.setCell("humans", "h1", "name", "Alice");
        store.setCell("humans", "h2", "name", "Bob");
      });

      const tables = store.getTables() as GenericTablesContent;

      const sessionRows = iterateTableRows(tables, "sessions");
      const humanRows = iterateTableRows(tables, "humans");

      expect(sessionRows).toHaveLength(1);
      expect(humanRows).toHaveLength(2);
      expect(humanRows.map((h) => h.name).sort()).toEqual(["Alice", "Bob"]);
    });

    test("returns empty array for missing table", () => {
      store.setCell("sessions", "s1", "title", "Session");

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "nonexistent");

      expect(rows).toEqual([]);
    });

    test("returns empty array for undefined tables", () => {
      const rows = iterateTableRows(
        undefined as unknown as GenericTablesContent,
        "sessions",
      );
      expect(rows).toEqual([]);
    });

    test("handles single row table", () => {
      store.setCell("items", "only-item", "name", "Single");

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "items");

      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        id: "only-item",
        name: "Single",
      });
    });

    test("handles multiple rows with different data types", () => {
      store.transaction(() => {
        store.setCell("items", "item-1", "name", "String Value");
        store.setCell("items", "item-1", "count", 42);
        store.setCell("items", "item-1", "active", true);
        store.setCell("items", "item-2", "name", "Another");
        store.setCell("items", "item-2", "count", 0);
        store.setCell("items", "item-2", "active", false);
        store.setCell("items", "item-3", "name", "");
        store.setCell("items", "item-3", "count", -10);
        store.setCell("items", "item-3", "active", true);
      });

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "items");

      expect(rows).toHaveLength(3);

      const item1 = rows.find((r) => r.id === "item-1");
      expect(item1).toMatchObject({
        id: "item-1",
        name: "String Value",
        count: 42,
        active: true,
      });

      const item2 = rows.find((r) => r.id === "item-2");
      expect(item2).toMatchObject({
        id: "item-2",
        name: "Another",
        count: 0,
        active: false,
      });

      const item3 = rows.find((r) => r.id === "item-3");
      expect(item3).toMatchObject({
        id: "item-3",
        name: "",
        count: -10,
        active: true,
      });
    });

    test("handles row with many properties", () => {
      store.transaction(() => {
        store.setCell("items", "item-1", "prop1", "value1");
        store.setCell("items", "item-1", "prop2", "value2");
        store.setCell("items", "item-1", "prop3", "value3");
        store.setCell("items", "item-1", "prop4", "value4");
        store.setCell("items", "item-1", "prop5", "value5");
      });

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "items");

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe("item-1");
      expect(Object.keys(rows[0])).toHaveLength(6);
    });

    test("row order is consistent with Object.entries", () => {
      store.transaction(() => {
        store.setCell("items", "a", "value", 1);
        store.setCell("items", "b", "value", 2);
        store.setCell("items", "c", "value", 3);
      });

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "items");
      const expectedOrder = Object.entries(tables.items!).map(([id, row]) => ({
        ...row,
        id,
      }));

      expect(rows).toEqual(expectedOrder);
    });

    test("handles special characters in row IDs", () => {
      store.setCell("items", "item-with-special-chars!@#$%", "name", "Special");

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "items");

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe("item-with-special-chars!@#$%");
    });

    test("handles unicode in cell values", () => {
      store.setCell("items", "item-1", "name", "Hello World");

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "items");

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("Hello World");
    });

    test("handles large number of rows", () => {
      store.transaction(() => {
        for (let i = 0; i < 100; i++) {
          store.setCell("items", `item-${i}`, "index", i);
        }
      });

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "items");

      expect(rows).toHaveLength(100);
      for (let i = 0; i < 100; i++) {
        expect(rows.find((r) => r.id === `item-${i}`)).toBeDefined();
      }
    });

    test("handles JSON stringified nested values", () => {
      const metadata = { nested: { deep: { value: 123 } } };
      store.setCell("items", "item-1", "metadata", JSON.stringify(metadata));

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "items");

      expect(rows).toHaveLength(1);
      expect(JSON.parse(rows[0].metadata as string)).toEqual(metadata);
    });

    test("handles rows after deletion", () => {
      store.transaction(() => {
        store.setCell("items", "item-1", "name", "First");
        store.setCell("items", "item-2", "name", "Second");
        store.setCell("items", "item-3", "name", "Third");
      });

      store.delRow("items", "item-2");

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "items");

      expect(rows).toHaveLength(2);
      expect(rows.find((r) => r.id === "item-1")).toBeDefined();
      expect(rows.find((r) => r.id === "item-2")).toBeUndefined();
      expect(rows.find((r) => r.id === "item-3")).toBeDefined();
    });

    test("handles rows after update", () => {
      store.setCell("items", "item-1", "name", "Original");

      store.setCell("items", "item-1", "name", "Updated");

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "items");

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("Updated");
    });

    test("handles empty table after all rows deleted", () => {
      store.setCell("items", "item-1", "name", "To Delete");
      store.delRow("items", "item-1");

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "items");

      expect(rows).toEqual([]);
    });

    test("handles table with numeric string keys", () => {
      store.transaction(() => {
        store.setCell("items", "0", "value", "zero");
        store.setCell("items", "1", "value", "one");
        store.setCell("items", "2", "value", "two");
      });

      const tables = store.getTables() as GenericTablesContent;
      const rows = iterateTableRows(tables, "items");

      expect(rows).toHaveLength(3);
      expect(rows.find((r) => r.id === "0")).toMatchObject({
        id: "0",
        value: "zero",
      });
      expect(rows.find((r) => r.id === "1")).toMatchObject({
        id: "1",
        value: "one",
      });
      expect(rows.find((r) => r.id === "2")).toMatchObject({
        id: "2",
        value: "two",
      });
    });
  });
});
