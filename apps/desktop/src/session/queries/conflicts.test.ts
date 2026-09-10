import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  calls: [] as Array<{ sql: string; params?: unknown[]; enabled?: boolean }>,
}));

vi.mock("~/db", () => ({
  executeTransaction: vi.fn(),
  liveQueryClient: { execute: vi.fn() },
  useLiveQuery: (options: {
    enabled?: boolean;
    mapRows?: (rows: Array<Record<string, unknown>>) => unknown;
    params?: unknown[];
    sql: string;
  }) => {
    mocks.calls.push({
      sql: options.sql,
      params: options.params,
      enabled: options.enabled,
    });
    return {
      data:
        options.enabled === false
          ? undefined
          : options.mapRows
            ? options.mapRows(mocks.rows)
            : mocks.rows,
    };
  },
}));

import {
  previewFromBody,
  useSessionConflicts,
  useSessionDocumentVersions,
} from "./conflicts";

function proseMirrorDoc(...paragraphs: string[]) {
  return JSON.stringify({
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  });
}

describe("previewFromBody", () => {
  it("joins text nodes of a ProseMirror document", () => {
    expect(
      previewFromBody(
        proseMirrorDoc("Hello there", "Second block"),
        "prosemirror_json",
      ),
    ).toBe("Hello there Second block");
  });

  it("returns an empty preview for an empty document", () => {
    expect(previewFromBody(proseMirrorDoc(), "prosemirror_json")).toBe("");
  });

  it("collapses whitespace in a markdown body", () => {
    expect(previewFromBody("# Title\n\nBody   text\n", "markdown")).toBe(
      "# Title Body text",
    );
  });

  it("falls back to the raw body when the JSON cannot be parsed", () => {
    expect(previewFromBody("not json at all", "prosemirror_json")).toBe(
      "not json at all",
    );
  });

  it("truncates long previews to 160 characters", () => {
    const preview = previewFromBody(
      proseMirrorDoc("a".repeat(400)),
      "prosemirror_json",
    );
    expect(preview).toHaveLength(163);
    expect(preview.endsWith("...")).toBe(true);
  });
});

describe("session conflict queries", () => {
  beforeEach(() => {
    mocks.rows = [];
    mocks.calls = [];
  });

  it("decodes the losing value and the conflicting field", () => {
    mocks.rows = [
      {
        id: "conflict-1",
        field_name: "body",
        lost_side: "remote",
        edited_at_ms: 1_757_000_000_000,
        value_json: JSON.stringify(proseMirrorDoc("Other device text")),
        created_at: "2026-09-09T10:00:00.000Z",
        body_format: "prosemirror_json",
      },
      {
        id: "conflict-2",
        field_name: "title",
        lost_side: "local",
        edited_at_ms: null,
        value_json: JSON.stringify("Older title"),
        created_at: "2026-09-09T09:00:00.000Z",
        body_format: "prosemirror_json",
      },
    ];

    const { result } = renderHook(() => useSessionConflicts("session-1"));

    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toMatchObject({
      id: "conflict-1",
      field: "body",
      lostSide: "remote",
      editedAtMs: 1_757_000_000_000,
    });
    expect(previewFromBody(result.current[0]!.value, "prosemirror_json")).toBe(
      "Other device text",
    );
    expect(result.current[1]).toMatchObject({
      field: "title",
      editedAtMs: null,
      value: "Older title",
    });
    expect(mocks.calls[0]?.params).toEqual(["session-1"]);
    expect(mocks.calls[0]?.sql).toContain("resolved_at IS NULL");
  });

  it("skips the query without a session id", () => {
    const { result } = renderHook(() => useSessionConflicts(""));

    expect(result.current).toEqual([]);
    expect(mocks.calls[0]?.enabled).toBe(false);
  });

  it("maps document versions for the note document", () => {
    mocks.rows = [
      {
        id: "version-1",
        body: proseMirrorDoc("Earlier body"),
        body_format: "prosemirror_json",
        source: "sync",
        created_at: "2026-09-09T08:00:00.000Z",
      },
    ];

    const { result } = renderHook(() =>
      useSessionDocumentVersions("session-1"),
    );

    expect(result.current[0]).toMatchObject({
      id: "version-1",
      source: "sync",
      bodyFormat: "prosemirror_json",
      createdAt: "2026-09-09T08:00:00.000Z",
    });
    expect(mocks.calls[0]?.sql).toContain("session_document_versions");
    expect(mocks.calls[0]?.params).toEqual(["session-1"]);
  });
});
