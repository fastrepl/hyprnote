import { describe, expect, test } from "vitest";

import { createEmptyLoadedSessionData, SESSION_TABLES } from "./types";

describe("createEmptyLoadedSessionData", () => {
  test("returns object with all required keys", () => {
    const result = createEmptyLoadedSessionData();

    for (const table of SESSION_TABLES) {
      expect(result).toHaveProperty(table);
    }
  });

  test("all values are empty objects", () => {
    const result = createEmptyLoadedSessionData();

    for (const table of SESSION_TABLES) {
      expect(result[table]).toEqual({});
    }
  });
});
