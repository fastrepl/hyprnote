import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  platform: vi.fn(() => "macos"),
  createSession: vi.fn(),
  requestSessionImport: vi.fn(),
  openCurrent: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-os", () => ({
  platform: mocks.platform,
}));

vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@anlg/ui/components/ui/kbd", () => ({
  Kbd: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@anlg/ui/components/ui/toast", () => ({
  toast: { error: mocks.toastError },
}));

vi.mock("~/shared/chat-cta", () => ({
  FloatingChatCTA: () => (
    <button type="button" aria-label="Ask Abrish anything">
      Ask Abrish anything
    </button>
  ),
}));

vi.mock("~/shared/main", () => ({
  StandardContentWrapper: ({
    children,
    floatingButton,
  }: {
    children: React.ReactNode;
    floatingButton?: React.ReactNode;
  }) => (
    <div>
      {children}
      {floatingButton}
    </div>
  ),
}));

vi.mock("~/shared/useNewNote", () => ({
  useNewNote: () => vi.fn(),
  useNewNoteAndListen: () => vi.fn(),
}));

vi.mock("~/session/queries", () => ({
  createSession: mocks.createSession,
}));

vi.mock("~/stt/session-import-intent", () => ({
  requestSessionImport: mocks.requestSessionImport,
}));

vi.mock("~/store/zustand/tabs", () => ({
  useTabs: (
    selector: (state: { openCurrent: typeof mocks.openCurrent }) => unknown,
  ) => selector({ openCurrent: mocks.openCurrent }),
}));

import { TabContentEmpty } from "./empty";

const emptyTab = {
  active: true,
  pinned: false,
  slotId: "slot-home",
  type: "empty",
} as const;

describe("TabContentEmpty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.platform.mockReturnValue("macos");
    mocks.createSession.mockResolvedValue("session-test-123");
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the existing recruiter home actions and chat button", () => {
    render(<TabContentEmpty tab={emptyTab} />);

    expect(
      screen.getByRole("button", { name: /Start recording/ }),
    ).toBeTruthy();

    expect(
      screen.getByRole("button", { name: /New interview notes/ }),
    ).toBeTruthy();

    expect(
      screen.getByRole("button", { name: /^Upload audio$/i }),
    ).toBeTruthy();

    expect(
      screen.getByRole("button", { name: /^Import transcript$/i }),
    ).toBeTruthy();

    expect(
      screen.getByRole("button", { name: "Ask Abrish anything" }),
    ).toBeTruthy();
  });

  it("opens the import dialog with the audio tab selected", () => {
    render(<TabContentEmpty tab={emptyTab} />);

    fireEvent.click(screen.getByRole("button", { name: /^Upload audio$/i }));

    expect(
      screen.getByRole("dialog", { name: /Import an interview/i }),
    ).toBeTruthy();

    expect(
      screen
        .getByRole("tab", { name: /Upload audio/i })
        .getAttribute("aria-selected"),
    ).toBe("true");

    expect(screen.getByLabelText(/Conversation name/i)).toBeTruthy();
    expect(screen.getByLabelText(/Interview type/i)).toBeTruthy();
    expect(screen.getByLabelText(/Interview date/i)).toBeTruthy();
  });

  it("switches to transcript import without adding a third tab", () => {
    render(<TabContentEmpty tab={emptyTab} />);

    fireEvent.click(
      screen.getByRole("button", { name: /^Import transcript$/i }),
    );

    expect(screen.getAllByRole("tab")).toHaveLength(2);

    expect(
      screen
        .getByRole("tab", { name: /Import transcript/i })
        .getAttribute("aria-selected"),
    ).toBe("true");

    expect(
      screen.getByRole("button", {
        name: /Continue to transcript import/i,
      }),
    ).toBeTruthy();
  });

  it("creates a session with interview metadata before opening the import", async () => {
    render(<TabContentEmpty tab={emptyTab} />);

    fireEvent.click(screen.getByRole("button", { name: /^Upload audio$/i }));

    fireEvent.change(screen.getByLabelText(/Conversation name/i), {
      target: { value: "Backend Engineer — Candidate A" },
    });

    fireEvent.change(screen.getByLabelText(/Interview type/i), {
      target: { value: "Technical Interview" },
    });

    fireEvent.change(screen.getByLabelText(/Interview date/i), {
      target: { value: "2026-10-12" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Continue to audio upload/i }),
    );

    await waitFor(() => {
      expect(mocks.createSession).toHaveBeenCalledTimes(1);
    });

    const [title, userId, initial] = mocks.createSession.mock.calls[0];

    expect(title).toBe("Backend Engineer — Candidate A");
    expect(userId).toBeUndefined();

    expect(JSON.parse(initial.event_json)).toMatchObject({
      title: "Backend Engineer — Candidate A",
      abrish_interview_type: "Technical Interview",
      abrish_interview_date: "2026-10-12",
    });

    expect(mocks.requestSessionImport).toHaveBeenCalledWith(
      "session-test-123",
      "audio",
    );

    expect(mocks.openCurrent).toHaveBeenCalledWith({
      type: "sessions",
      id: "session-test-123",
      state: {
        view: null,
        autoStart: null,
        scheduledAutoStart: null,
      },
    });
  });

  it("uses the transcript import intent when transcript import is selected", async () => {
    render(<TabContentEmpty tab={emptyTab} />);

    fireEvent.click(
      screen.getByRole("button", { name: /^Import transcript$/i }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Continue to transcript import/i }),
    );

    await waitFor(() => {
      expect(mocks.requestSessionImport).toHaveBeenCalledWith(
        "session-test-123",
        "transcript",
      );
    });
  });

  it("closes the import dialog when Cancel is clicked", () => {
    render(<TabContentEmpty tab={emptyTab} />);

    fireEvent.click(screen.getByRole("button", { name: /^Upload audio$/i }));

    fireEvent.click(screen.getByRole("button", { name: /^Cancel$/i }));

    expect(
      screen.queryByRole("dialog", { name: /Import an interview/i }),
    ).toBeNull();
  });

  it("shows an error if session creation fails", async () => {
    mocks.createSession.mockRejectedValueOnce(new Error("Creation failed"));

    render(<TabContentEmpty tab={emptyTab} />);

    fireEvent.click(screen.getByRole("button", { name: /^Upload audio$/i }));

    fireEvent.click(
      screen.getByRole("button", { name: /Continue to audio upload/i }),
    );

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Creation failed");
    });

    expect(mocks.requestSessionImport).not.toHaveBeenCalled();
    expect(mocks.openCurrent).not.toHaveBeenCalled();
  });
});
