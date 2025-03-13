import { describe, expect, it } from "vitest";

import { formatDate } from "./datetime";

describe("datetime", () => {
  it("should be a function", () => {
    expect(formatDate(new Date(), "yyyy-MM-dd")).toBe("2025-03-13");
  });
});
