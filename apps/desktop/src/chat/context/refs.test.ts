import { describe, expect, it } from "vitest";

import type { ContextRef } from "./entities";
import { orderPromptContextRefs } from "./refs";

describe("orderPromptContextRefs", () => {
  it("renders a folder once when auto and manual refs name the same folder", () => {
    const refs: ContextRef[] = [
      {
        kind: "folder",
        key: "folder:auto:CS 101",
        source: "auto-current",
        folderId: "CS 101",
      },
      {
        kind: "folder",
        key: "folder:manual:CS 101",
        source: "manual",
        folderId: "CS 101",
      },
      {
        kind: "folder",
        key: "folder:manual:Product",
        source: "manual",
        folderId: "Product",
      },
    ];

    const ordered = orderPromptContextRefs(refs, undefined);
    expect(
      ordered.filter((ref) => ref.kind === "folder").map((ref) => ref.key),
    ).toEqual(["folder:auto:CS 101", "folder:manual:Product"]);
  });
});
