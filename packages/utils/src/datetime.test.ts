import { describe, expect, it } from "vitest";
import { differenceInBusinessDays } from "./datetime";

describe("datetime", () => {
  it("should be a function", () => {
    const dateString = new Date().toISOString();
    const now = new Date();

    expect(differenceInBusinessDays(now, new Date(dateString), "Asia/Seoul")).toBe(0);
  });
});
