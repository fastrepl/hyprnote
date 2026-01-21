import { createMergeableStore } from "tinybase";
import { createCustomPersister } from "tinybase/persisters";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { extractChangedTables } from "./extract-changed-tables";
import type { ChangedTables } from "./types";

const MergeableStoreOnly = 2;

describe("extractChangedTables", () => {
  describe("defensive input handling", () => {
    test("returns null for undefined", () => {
      expect(extractChangedTables(undefined)).toBeNull();
    });

    test("returns null for null", () => {
      expect(extractChangedTables(null as any)).toBeNull();
    });

    test("returns null for empty array", () => {
      expect(extractChangedTables([] as any)).toBeNull();
    });

    test("returns null for non-array input", () => {
      expect(extractChangedTables("string" as any)).toBeNull();
      expect(extractChangedTables(123 as any)).toBeNull();
      expect(extractChangedTables({} as any)).toBeNull();
    });

    test("returns null for empty inner array (malformed MergeableChanges)", () => {
      const malformed = [[], [{}, "hlc"], 1] as any;
      expect(extractChangedTables(malformed)).toBeNull();
    });

    test("returns null for array as first element (not valid ChangedTables)", () => {
      const malformed = [["not", "valid"], {}, 1] as any;
      expect(extractChangedTables(malformed)).toBeNull();
    });

    test("returns null when first element of inner array is null", () => {
      const malformed = [[null, "hlc"], [{}, "hlc"], 1] as any;
      expect(extractChangedTables(malformed)).toBeNull();
    });

    test("returns null when first element of inner array is not an object", () => {
      const malformed = [["string", "hlc"], [{}, "hlc"], 1] as any;
      expect(extractChangedTables(malformed)).toBeNull();
    });
  });

  describe("e2e: MergeableStore with persister", () => {
    let store: ReturnType<typeof createMergeableStore>;
    let saveFn: ReturnType<typeof vi.fn>;
    let capturedChangedTables: ChangedTables | null;

    beforeEach(async () => {
      store = createMergeableStore("test-store");
      capturedChangedTables = null;

      saveFn = vi.fn(async (_getContent, changes) => {
        capturedChangedTables = extractChangedTables(changes);
      });

      const persister = createCustomPersister(
        store,
        async () => undefined,
        saveFn,
        () => null,
        () => {},
        undefined,
        MergeableStoreOnly,
      );

      await persister.startAutoSave();

      saveFn.mockClear();
      capturedChangedTables = null;
    });

    describe("basic operations", () => {
      test("single cell change", async () => {
        store.setCell("sessions", "session-1", "title", "Meeting Notes");

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());

        expect(capturedChangedTables).toEqual({
          sessions: { "session-1": expect.any(Object) },
        });
      });

      test("multiple cells in same row", async () => {
        store.transaction(() => {
          store.setCell("sessions", "session-1", "title", "Meeting");
          store.setCell("sessions", "session-1", "raw_md", "# Notes");
          store.setCell("sessions", "session-1", "created_at", "2024-01-01");
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());

        expect(capturedChangedTables).toEqual({
          sessions: { "session-1": expect.any(Object) },
        });
        expect(Object.keys(capturedChangedTables!)).toHaveLength(1);
      });

      test("multiple rows in same table", async () => {
        store.transaction(() => {
          store.setCell("sessions", "s1", "title", "Session 1");
          store.setCell("sessions", "s2", "title", "Session 2");
          store.setCell("sessions", "s3", "title", "Session 3");
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());

        expect(capturedChangedTables).toEqual({
          sessions: {
            s1: expect.any(Object),
            s2: expect.any(Object),
            s3: expect.any(Object),
          },
        });
      });

      test("multiple tables in single transaction", async () => {
        store.transaction(() => {
          store.setCell("sessions", "session-1", "title", "Meeting");
          store.setCell("humans", "human-1", "name", "Alice");
          store.setCell(
            "transcripts",
            "transcript-1",
            "session_id",
            "session-1",
          );
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());

        expect(capturedChangedTables).toHaveProperty("sessions");
        expect(capturedChangedTables).toHaveProperty("humans");
        expect(capturedChangedTables).toHaveProperty("transcripts");
        expect(capturedChangedTables!.sessions).toHaveProperty("session-1");
        expect(capturedChangedTables!.humans).toHaveProperty("human-1");
        expect(capturedChangedTables!.transcripts).toHaveProperty(
          "transcript-1",
        );
      });
    });

    describe("deletions", () => {
      test("row deletion", async () => {
        store.setCell("sessions", "session-1", "title", "To Delete");
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        saveFn.mockClear();

        store.delRow("sessions", "session-1");

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables).toHaveProperty("sessions");
        expect(capturedChangedTables!.sessions).toHaveProperty("session-1");
      });

      test("cell deletion", async () => {
        store.transaction(() => {
          store.setCell("sessions", "session-1", "title", "Title");
          store.setCell("sessions", "session-1", "raw_md", "Content");
        });
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        saveFn.mockClear();

        store.delCell("sessions", "session-1", "raw_md");

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables).toEqual({
          sessions: { "session-1": expect.any(Object) },
        });
      });

      test("table deletion", async () => {
        store.transaction(() => {
          store.setCell("sessions", "s1", "title", "One");
          store.setCell("sessions", "s2", "title", "Two");
        });
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        saveFn.mockClear();

        store.delTable("sessions");

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables).toHaveProperty("sessions");
      });

      test("delete multiple rows in transaction", async () => {
        store.transaction(() => {
          store.setCell("sessions", "s1", "title", "One");
          store.setCell("sessions", "s2", "title", "Two");
          store.setCell("sessions", "s3", "title", "Three");
        });
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        saveFn.mockClear();

        store.transaction(() => {
          store.delRow("sessions", "s1");
          store.delRow("sessions", "s3");
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("s1");
        expect(capturedChangedTables!.sessions).toHaveProperty("s3");
        expect(capturedChangedTables!.sessions).not.toHaveProperty("s2");
      });
    });

    describe("updates", () => {
      test("update existing cell", async () => {
        store.setCell("sessions", "session-1", "title", "Original");
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        saveFn.mockClear();

        store.setCell("sessions", "session-1", "title", "Updated");

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables).toEqual({
          sessions: { "session-1": expect.any(Object) },
        });
      });

      test("setting same value does not trigger save", async () => {
        store.setCell("sessions", "session-1", "title", "Same");
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        saveFn.mockClear();

        store.setCell("sessions", "session-1", "title", "Same");

        await new Promise((r) => setTimeout(r, 50));
        expect(saveFn).not.toHaveBeenCalled();
      });

      test("mixed create/update/delete in single transaction", async () => {
        store.transaction(() => {
          store.setCell("sessions", "existing", "title", "Existing");
          store.setCell("humans", "to-delete", "name", "Delete Me");
        });
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        saveFn.mockClear();

        store.transaction(() => {
          store.setCell("sessions", "new", "title", "New Session");
          store.setCell("sessions", "existing", "title", "Updated");
          store.delRow("humans", "to-delete");
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("new");
        expect(capturedChangedTables!.sessions).toHaveProperty("existing");
        expect(capturedChangedTables!.humans).toHaveProperty("to-delete");
      });
    });

    describe("cell value types", () => {
      test("string values", async () => {
        store.setCell("sessions", "s1", "title", "Hello World");

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("s1");
      });

      test("empty string value", async () => {
        store.setCell("sessions", "s1", "title", "");

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("s1");
      });

      test("boolean values", async () => {
        store.setCell("sessions", "s1", "active", true);

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("s1");
      });

      test("number values", async () => {
        store.setCell("sessions", "s1", "count", 42);

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("s1");
      });

      test("zero value", async () => {
        store.setCell("sessions", "s1", "count", 0);

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("s1");
      });

      test("negative number value", async () => {
        store.setCell("sessions", "s1", "count", -42);

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("s1");
      });

      test("float value", async () => {
        store.setCell("sessions", "s1", "score", 3.14159);

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("s1");
      });
    });

    describe("transaction behavior", () => {
      test("no-op transaction does not call save", async () => {
        store.transaction(() => {});

        await new Promise((r) => setTimeout(r, 50));
        expect(saveFn).not.toHaveBeenCalled();
      });

      test("sequential transactions produce separate save calls", async () => {
        store.setCell("sessions", "s1", "title", "First");
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));

        const firstChanges = capturedChangedTables;
        expect(firstChanges).toEqual({ sessions: { s1: expect.any(Object) } });

        store.setCell("sessions", "s2", "title", "Second");
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(2));

        expect(capturedChangedTables).toEqual({
          sessions: { s2: expect.any(Object) },
        });
      });

      test("net-zero change still triggers save (MergeableStore tracks HLC)", async () => {
        store.setCell("sessions", "s1", "title", "Original");
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        saveFn.mockClear();

        store.transaction(() => {
          store.setCell("sessions", "s1", "title", "Temp");
          store.setCell("sessions", "s1", "title", "Original");
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("s1");
      });

      test("create and delete in same transaction still triggers save", async () => {
        store.transaction(() => {
          store.setCell("sessions", "temp", "title", "Temporary");
          store.delRow("sessions", "temp");
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("temp");
      });
    });

    describe("isolation between tables", () => {
      test("change to one table does not include other tables", async () => {
        store.transaction(() => {
          store.setCell("sessions", "s1", "title", "Session");
          store.setCell("humans", "h1", "name", "Human");
        });
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        saveFn.mockClear();

        store.setCell("sessions", "s1", "title", "Updated Session");

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables).toHaveProperty("sessions");
        expect(capturedChangedTables).not.toHaveProperty("humans");
      });

      test("changes to different tables in separate transactions", async () => {
        store.setCell("sessions", "s1", "title", "Session");
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        expect(capturedChangedTables).toHaveProperty("sessions");
        expect(capturedChangedTables).not.toHaveProperty("humans");

        store.setCell("humans", "h1", "name", "Human");
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(2));
        expect(capturedChangedTables).toHaveProperty("humans");
        expect(capturedChangedTables).not.toHaveProperty("sessions");
      });
    });

    describe("edge cases", () => {
      test("deeply nested cell values", async () => {
        store.setCell(
          "sessions",
          "s1",
          "metadata",
          JSON.stringify({ nested: { deep: { value: 123 } } }),
        );

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("s1");
      });

      test("special characters in row IDs", async () => {
        store.setCell(
          "sessions",
          "session-with-special-chars!@#$%",
          "title",
          "Test",
        );

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty(
          "session-with-special-chars!@#$%",
        );
      });

      test("unicode in cell values", async () => {
        store.setCell("sessions", "s1", "title", "Hello World");

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("s1");
      });

      test("very long string values", async () => {
        const longString = "a".repeat(10000);
        store.setCell("sessions", "s1", "content", longString);

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("s1");
      });
    });

    describe("bulk operations", () => {
      test("setRow operation", async () => {
        store.setRow("sessions", "session-1", {
          title: "Meeting",
          raw_md: "# Notes",
          created_at: "2024-01-01",
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());

        expect(capturedChangedTables).toEqual({
          sessions: { "session-1": expect.any(Object) },
        });
      });

      test("setTable operation replacing entire table", async () => {
        store.setCell("sessions", "old-session", "title", "Old");
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        saveFn.mockClear();

        store.setTable("sessions", {
          "new-1": { title: "New 1" },
          "new-2": { title: "New 2" },
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables).toHaveProperty("sessions");
      });

      test("setTables operation with multiple tables", async () => {
        store.setCell("sessions", "old", "title", "Old");
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        saveFn.mockClear();

        store.setTables({
          sessions: { s1: { title: "Session 1" } },
          humans: { h1: { name: "Alice" } },
          transcripts: { t1: { content: "Text" } },
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables).toBeDefined();
      });
    });

    describe("performance and scale", () => {
      test("rapid sequential operations on same cell", async () => {
        store.setCell("sessions", "s1", "title", "V1");
        store.setCell("sessions", "s1", "title", "V2");
        store.setCell("sessions", "s1", "title", "V3");
        store.setCell("sessions", "s1", "title", "V4");

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables!.sessions).toHaveProperty("s1");
      });

      test("large number of rows in single table", async () => {
        store.transaction(() => {
          for (let i = 0; i < 100; i++) {
            store.setCell("sessions", `session-${i}`, "title", `Session ${i}`);
          }
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(Object.keys(capturedChangedTables!.sessions || {})).toHaveLength(
          100,
        );
      });

      test("large number of tables", async () => {
        store.transaction(() => {
          for (let i = 0; i < 50; i++) {
            store.setCell(`table${i}`, "row1", "col1", `value${i}`);
          }
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(Object.keys(capturedChangedTables || {})).toHaveLength(50);
      });
    });

    describe("values store operations", () => {
      test("setValue with table changes", async () => {
        store.transaction(() => {
          store.setCell("sessions", "s1", "title", "Session");
          store.setValue("app_version", "1.0.0");
          store.setValue("theme", "dark");
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables).toEqual({
          sessions: { s1: expect.any(Object) },
        });
      });

      test("setValue without table changes returns null for tables", async () => {
        store.setValue("setting", "value");

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(
          capturedChangedTables === null ||
            Object.keys(capturedChangedTables).length === 0,
        ).toBe(true);
      });

      test("delValue operation", async () => {
        store.setValue("temp", "value");
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        saveFn.mockClear();

        store.delValue("temp");

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(
          capturedChangedTables === null ||
            Object.keys(capturedChangedTables).length === 0,
        ).toBe(true);
      });

      test("mixed table and value changes in transaction", async () => {
        store.transaction(() => {
          store.setCell("sessions", "s1", "title", "Meeting");
          store.setValue("last_sync", "2024-01-01");
          store.setCell("humans", "h1", "name", "Alice");
          store.setValue("app_version", "2.0.0");
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables).toHaveProperty("sessions");
        expect(capturedChangedTables).toHaveProperty("humans");
      });
    });

    describe("format handling", () => {
      test("handles table with numeric string keys", async () => {
        store.transaction(() => {
          store.setRow("0", "row1", { value: "table0" });
          store.setRow("1", "row1", { value: "table1" });
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables).toBeDefined();
        expect(capturedChangedTables!["0"]).toHaveProperty("row1");
        expect(capturedChangedTables!["1"]).toHaveProperty("row1");
      });

      test("handles multiple rapid transactions", async () => {
        const allChanges: (ChangedTables | null)[] = [];

        for (let i = 0; i < 5; i++) {
          store.setRow("users", `user${i}`, { name: `User${i}` });
          await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(i + 1));
          allChanges.push(capturedChangedTables);
        }

        for (const change of allChanges) {
          expect(change).toBeDefined();
          expect(change).toHaveProperty("users");
        }
      });

      test("handles transaction with additions, updates, and deletions", async () => {
        store.transaction(() => {
          store.setCell("users", "user1", "name", "Alice");
          store.setCell("users", "user1", "age", 30);
          store.setCell("users", "user2", "name", "Bob");
          store.setCell("users", "user3", "name", "Charlie");
        });
        await vi.waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
        saveFn.mockClear();

        store.transaction(() => {
          store.setRow("users", "user4", { name: "David", age: 40 });
          store.setCell("users", "user1", "age", 31);
          store.delRow("users", "user2");
        });

        await vi.waitFor(() => expect(saveFn).toHaveBeenCalled());
        expect(capturedChangedTables).toBeDefined();
        expect(capturedChangedTables!.users).toHaveProperty("user4");
        expect(capturedChangedTables!.users).toHaveProperty("user1");
        expect(capturedChangedTables!.users).toHaveProperty("user2");
      });
    });
  });
});
