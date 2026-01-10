import { describe, expect, test } from "vitest";

import { extractSessionIdAndFolder } from "./session";

describe("extractSessionIdAndFolder", () => {
  describe("standard paths", () => {
    test("extracts session id and empty folder from root session path", () => {
      const result = extractSessionIdAndFolder(
        "/data/hyprnote/sessions/session-123/_meta.json",
      );
      expect(result).toEqual({
        sessionId: "session-123",
        folderPath: "/data/hyprnote/sessions",
      });
    });

    test("extracts session id and folder from nested path", () => {
      const result = extractSessionIdAndFolder(
        "/data/hyprnote/sessions/work/session-123/_meta.json",
      );
      expect(result).toEqual({
        sessionId: "session-123",
        folderPath: "/data/hyprnote/sessions/work",
      });
    });

    test("extracts session id and folder from deeply nested path", () => {
      const result = extractSessionIdAndFolder(
        "/data/hyprnote/sessions/work/project-a/meetings/session-123/_meta.json",
      );
      expect(result).toEqual({
        sessionId: "session-123",
        folderPath: "/data/hyprnote/sessions/work/project-a/meetings",
      });
    });
  });

  describe("uuid session ids", () => {
    test("extracts uuid session id", () => {
      const result = extractSessionIdAndFolder(
        "/data/sessions/550e8400-e29b-41d4-a716-446655440000/_meta.json",
      );
      expect(result).toEqual({
        sessionId: "550e8400-e29b-41d4-a716-446655440000",
        folderPath: "/data/sessions",
      });
    });
  });

  describe("different file types", () => {
    test("works with transcript.json files", () => {
      const result = extractSessionIdAndFolder(
        "/data/sessions/session-123/_transcript.json",
      );
      expect(result).toEqual({
        sessionId: "session-123",
        folderPath: "/data/sessions",
      });
    });

    test("works with markdown files", () => {
      const result = extractSessionIdAndFolder(
        "/data/sessions/session-123/_summary.md",
      );
      expect(result).toEqual({
        sessionId: "session-123",
        folderPath: "/data/sessions",
      });
    });
  });

  describe("edge cases", () => {
    test("returns empty session id for root path", () => {
      const result = extractSessionIdAndFolder("/_meta.json");
      expect(result.sessionId).toBe("");
    });

    test("handles path with single segment", () => {
      const result = extractSessionIdAndFolder("_meta.json");
      expect(result.sessionId).toBe("");
      expect(result.folderPath).toBe("");
    });

    test("handles empty path", () => {
      const result = extractSessionIdAndFolder("");
      expect(result.sessionId).toBe("");
      expect(result.folderPath).toBe("");
    });

    test("handles path with only directory", () => {
      const result = extractSessionIdAndFolder("/data/sessions/session-123/");
      expect(result.sessionId).toBe("session-123");
      expect(result.folderPath).toBe("/data/sessions");
    });

    test("handles relative path", () => {
      const result = extractSessionIdAndFolder(
        "sessions/session-123/_meta.json",
      );
      expect(result.sessionId).toBe("session-123");
      expect(result.folderPath).toBe("sessions");
    });
  });
});
