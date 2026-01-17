import { describe, expect, test } from "vitest";

import type { TablesContent } from "./types";
import {
  asTablesChanges,
  extractChangedTables,
  iterateTableRows,
} from "./utils";

describe("extractChangedTables", () => {
  describe("null/invalid input handling", () => {
    test("returns null for undefined", () => {
      expect(extractChangedTables(undefined)).toBeNull();
    });

    test("returns null for null", () => {
      expect(extractChangedTables(null as any)).toBeNull();
    });

    test("returns null for empty array", () => {
      expect(extractChangedTables([] as any)).toBeNull();
    });

    test("returns null for non-array", () => {
      expect(extractChangedTables({} as any)).toBeNull();
    });

    test("returns null for string", () => {
      expect(extractChangedTables("invalid" as any)).toBeNull();
    });

    test("returns null for number", () => {
      expect(extractChangedTables(123 as any)).toBeNull();
    });
  });

  describe("Regular Changes format: [changedTables, changedValues, 1]", () => {
    test("extracts changed tables from regular changes", () => {
      const changes = [
        { sessions: { "session-1": { title: "Test" } } },
        {},
        1,
      ] as any;

      const result = extractChangedTables(changes);

      expect(result).toEqual({
        sessions: { "session-1": { title: "Test" } },
      });
    });

    test("handles multiple tables in changes", () => {
      const changes = [
        {
          sessions: { "session-1": { title: "Test" } },
          humans: { "human-1": { name: "John" } },
        },
        {},
        1,
      ] as any;

      const result = extractChangedTables(changes);

      expect(result).toEqual({
        sessions: { "session-1": { title: "Test" } },
        humans: { "human-1": { name: "John" } },
      });
    });

    test("handles empty tables object", () => {
      const changes = [{}, {}, 1] as any;

      const result = extractChangedTables(changes);

      expect(result).toEqual({});
    });

    test("handles deletion markers (undefined values)", () => {
      const changes = [{ sessions: { "session-1": undefined } }, {}, 1] as any;

      const result = extractChangedTables(changes);

      expect(result).toEqual({
        sessions: { "session-1": undefined },
      });
    });
  });

  describe("edge cases", () => {
    test("handles single element array", () => {
      const changes = [{ sessions: { "s-1": { title: "T" } } }] as any;

      const result = extractChangedTables(changes);

      expect(result).toEqual({ sessions: { "s-1": { title: "T" } } });
    });

    test("handles null first element", () => {
      const changes = [null, {}, 1] as any;

      const result = extractChangedTables(changes);

      expect(result).toBeNull();
    });
  });
});

describe("asTablesChanges", () => {
  test("wraps tables in changes format", () => {
    const tables = {
      sessions: { "session-1": { title: "Test" } },
    };

    const result = asTablesChanges(tables);

    expect(result).toEqual([tables, {}, 1]);
  });

  test("returns tuple with empty values object", () => {
    const tables = {};
    const result = asTablesChanges(tables);

    expect(result[1]).toEqual({});
    expect(result[2]).toBe(1);
  });

  test("handles deletion markers", () => {
    const tables = {
      sessions: { "session-1": undefined },
    };

    const result = asTablesChanges(tables);

    expect(result[0]).toEqual(tables);
  });

  test("handles table-level deletion", () => {
    const tables = {
      sessions: undefined,
    };

    const result = asTablesChanges(tables as any);

    expect(result[0]).toEqual({ sessions: undefined });
  });
});

describe("iterateTableRows", () => {
  test("iterates over table rows and adds id", () => {
    const tables: TablesContent = {
      sessions: {
        "session-1": {
          user_id: "user-1",
          created_at: "2024-01-01",
          title: "Test",
          folder_id: "",
          event_id: "",
          raw_md: "",
        },
        "session-2": {
          user_id: "user-1",
          created_at: "2024-01-02",
          title: "Test 2",
          folder_id: "",
          event_id: "",
          raw_md: "",
        },
      },
    };

    const result = iterateTableRows(tables, "sessions");

    expect(result).toHaveLength(2);
    expect(result.find((r) => r.id === "session-1")).toEqual({
      id: "session-1",
      user_id: "user-1",
      created_at: "2024-01-01",
      title: "Test",
      folder_id: "",
      event_id: "",
      raw_md: "",
    });
    expect(result.find((r) => r.id === "session-2")).toEqual({
      id: "session-2",
      user_id: "user-1",
      created_at: "2024-01-02",
      title: "Test 2",
      folder_id: "",
      event_id: "",
      raw_md: "",
    });
  });

  test("returns empty array for undefined tables", () => {
    const result = iterateTableRows(undefined, "sessions");
    expect(result).toEqual([]);
  });

  test("returns empty array for missing table", () => {
    const tables: TablesContent = {};
    const result = iterateTableRows(tables, "sessions");
    expect(result).toEqual([]);
  });

  test("returns empty array for empty table", () => {
    const tables: TablesContent = {
      sessions: {},
    };
    const result = iterateTableRows(tables, "sessions");
    expect(result).toEqual([]);
  });

  test("handles humans table", () => {
    const tables: TablesContent = {
      humans: {
        "human-1": {
          user_id: "user-1",
          name: "John Doe",
          email: "john@example.com",
          org_id: "",
          job_title: "",
          linkedin_username: "",
          memo: "",
        },
      },
    };

    const result = iterateTableRows(tables, "humans");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("human-1");
    expect(result[0].name).toBe("John Doe");
  });
});
