import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  TinyBaseTestWrapper,
  useFolder,
  useFoldersByParent,
  useHuman,
  useOrganization,
  useSession,
  useSessionParticipants,
  useSessionRawMd,
  useSessionsByFolder,
  useSessionTitle,
  useSetSessionRawMd,
  useSetSessionTitle,
  useTemplate,
  useTranscriptsBySession,
  useUserId,
  useVisibleFolders,
  useVisibleHumans,
  useVisibleOrganizations,
  useVisibleTemplates,
  useVisibleVocabs,
  useWordsByTranscript,
} from "./tinybase";

describe("TinyBase hooks", () => {
  describe("useSession", () => {
    it("returns an object with session fields", () => {
      const { result } = renderHook(() => useSession("test-session"), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(result.current).toHaveProperty("title");
      expect(result.current).toHaveProperty("rawMd");
      expect(result.current).toHaveProperty("enhancedMd");
      expect(result.current).toHaveProperty("createdAt");
      expect(result.current).toHaveProperty("eventId");
      expect(result.current).toHaveProperty("folderId");
    });

    it("returns undefined for non-existent session", () => {
      const { result } = renderHook(() => useSession("non-existent"), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(result.current.title).toBeUndefined();
      expect(result.current.rawMd).toBeUndefined();
    });
  });

  describe("useSessionTitle", () => {
    it("returns undefined for non-existent session", () => {
      const { result } = renderHook(() => useSessionTitle("non-existent"), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(result.current).toBeUndefined();
    });
  });

  describe("useSetSessionTitle", () => {
    it("returns a function", () => {
      const { result } = renderHook(() => useSetSessionTitle(), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(typeof result.current).toBe("function");
    });
  });

  describe("useSessionRawMd", () => {
    it("returns undefined for non-existent session", () => {
      const { result } = renderHook(() => useSessionRawMd("non-existent"), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(result.current).toBeUndefined();
    });
  });

  describe("useSetSessionRawMd", () => {
    it("returns a function", () => {
      const { result } = renderHook(() => useSetSessionRawMd(), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(typeof result.current).toBe("function");
    });
  });

  describe("useHuman", () => {
    it("returns an object with human fields", () => {
      const { result } = renderHook(() => useHuman("test-human"), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(result.current).toHaveProperty("name");
      expect(result.current).toHaveProperty("email");
      expect(result.current).toHaveProperty("orgId");
      expect(result.current).toHaveProperty("jobTitle");
      expect(result.current).toHaveProperty("linkedinUsername");
      expect(result.current).toHaveProperty("isUser");
    });
  });

  describe("useOrganization", () => {
    it("returns an object with organization fields", () => {
      const { result } = renderHook(() => useOrganization("test-org"), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(result.current).toHaveProperty("name");
      expect(result.current).toHaveProperty("createdAt");
    });
  });

  describe("useFolder", () => {
    it("returns an object with folder fields", () => {
      const { result } = renderHook(() => useFolder("test-folder"), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(result.current).toHaveProperty("name");
      expect(result.current).toHaveProperty("parentFolderId");
      expect(result.current).toHaveProperty("createdAt");
    });
  });

  describe("useTemplate", () => {
    it("returns an object with template fields", () => {
      const { result } = renderHook(() => useTemplate("test-template"), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(result.current).toHaveProperty("title");
      expect(result.current).toHaveProperty("description");
      expect(result.current).toHaveProperty("sections");
      expect(result.current).toHaveProperty("createdAt");
    });
  });

  describe("useSessionParticipants", () => {
    it("returns an array", () => {
      const { result } = renderHook(
        () => useSessionParticipants("test-session"),
        {
          wrapper: ({ children }) => (
            <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
          ),
        },
      );

      expect(Array.isArray(result.current)).toBe(true);
    });
  });

  describe("useTranscriptsBySession", () => {
    it("returns an array", () => {
      const { result } = renderHook(
        () => useTranscriptsBySession("test-session"),
        {
          wrapper: ({ children }) => (
            <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
          ),
        },
      );

      expect(Array.isArray(result.current)).toBe(true);
    });
  });

  describe("useWordsByTranscript", () => {
    it("returns an array", () => {
      const { result } = renderHook(
        () => useWordsByTranscript("test-transcript"),
        {
          wrapper: ({ children }) => (
            <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
          ),
        },
      );

      expect(Array.isArray(result.current)).toBe(true);
    });
  });

  describe("useSessionsByFolder", () => {
    it("returns an array", () => {
      const { result } = renderHook(() => useSessionsByFolder("test-folder"), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(Array.isArray(result.current)).toBe(true);
    });
  });

  describe("useFoldersByParent", () => {
    it("returns an array", () => {
      const { result } = renderHook(
        () => useFoldersByParent("test-parent-folder"),
        {
          wrapper: ({ children }) => (
            <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
          ),
        },
      );

      expect(Array.isArray(result.current)).toBe(true);
    });
  });

  describe("useVisibleTemplates", () => {
    it("returns an array", () => {
      const { result } = renderHook(() => useVisibleTemplates(), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(Array.isArray(result.current)).toBe(true);
    });
  });

  describe("useVisibleHumans", () => {
    it("returns an array", () => {
      const { result } = renderHook(() => useVisibleHumans(), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(Array.isArray(result.current)).toBe(true);
    });
  });

  describe("useVisibleOrganizations", () => {
    it("returns an array", () => {
      const { result } = renderHook(() => useVisibleOrganizations(), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(Array.isArray(result.current)).toBe(true);
    });
  });

  describe("useVisibleFolders", () => {
    it("returns an array", () => {
      const { result } = renderHook(() => useVisibleFolders(), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(Array.isArray(result.current)).toBe(true);
    });
  });

  describe("useVisibleVocabs", () => {
    it("returns an object", () => {
      const { result } = renderHook(() => useVisibleVocabs(), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(typeof result.current).toBe("object");
    });
  });

  describe("useUserId", () => {
    it("returns undefined when no user id is set", () => {
      const { result } = renderHook(() => useUserId(), {
        wrapper: ({ children }) => (
          <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
        ),
      });

      expect(result.current).toBeUndefined();
    });
  });

  describe("TinyBaseTestWrapper", () => {
    it("provides store context for hooks", () => {
      const { result } = renderHook(
        () => ({
          session: useSession("session-1"),
          human: useHuman("human-1"),
        }),
        {
          wrapper: ({ children }) => (
            <TinyBaseTestWrapper>{children}</TinyBaseTestWrapper>
          ),
        },
      );

      expect(result.current.session).toHaveProperty("title");
      expect(result.current.human).toHaveProperty("name");
    });
  });
});
