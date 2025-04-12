import { i18n } from "@lingui/core";
import { beforeAll, describe, expect, it } from "vitest";

import { differenceInBusinessDays, formatRelativeWithDay } from "./datetime";

beforeAll(() => {
  i18n.activate("en");
});

describe("differenceInBusinessDays", () => {
  it("works", () => {
    const dateString = new Date().toISOString();
    const now = new Date();

    expect(differenceInBusinessDays(now, new Date(dateString), "Asia/Seoul")).toBe(0);
  });
});

describe("formatRelativeWithDay", () => {
  it("works", () => {
    expect(formatRelativeWithDay("2025-04-14T09:07:57.843843Z", "Asia/Seoul", new Date("2025-04-12T08:16:31.438Z")))
      .toBe(
        "2 days later (Mon)",
      );
  });
});
