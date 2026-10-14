import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  session: null as { title: string; created_at: string } | null,
  event: null as { started_at?: string } | null,
  participants: [] as Array<{
    id: string;
    name: string;
    email: string;
    jobTitle: string;
    organizationName: string;
  }>,
  canGoBack: false,
  goBack: vi.fn(),
}));

vi.mock("@lingui/react/macro", () => ({
  useLingui: () => ({
    t: (strings: TemplateStringsArray) => strings.join(""),
  }),
}));

vi.mock("~/session/queries", () => ({
  useSession: () => hoisted.session,
}));

vi.mock("~/session/hooks/useSessionEvent", () => ({
  useSessionEvent: () => hoisted.event,
}));

vi.mock("~/session/queries/participants", () => ({
  useSessionParticipants: () => hoisted.participants,
}));

vi.mock("~/store/zustand/tabs", () => ({
  useTabs: (
    selector: (state: { canGoBack: boolean; goBack: () => void }) => unknown,
  ) => selector({ canGoBack: hoisted.canGoBack, goBack: hoisted.goBack }),
}));

import { InterviewHeader } from "./interview-header";

describe("InterviewHeader", () => {
  beforeEach(() => {
    hoisted.session = {
      title: "Backend Engineer interview",
      created_at: "2026-10-01T09:00:00.000Z",
    };
    hoisted.event = null;
    hoisted.participants = [];
    hoisted.canGoBack = false;
    hoisted.goBack.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing until the session exists", () => {
    hoisted.session = null;
    const { container } = render(<InterviewHeader sessionId="session-1" />);

    expect(container.firstChild).toBeNull();
  });

  it("shows the session title and falls back to Untitled", () => {
    const { rerender } = render(<InterviewHeader sessionId="session-1" />);
    expect(screen.getByText("Backend Engineer interview")).not.toBeNull();

    hoisted.session = { title: "  ", created_at: "2026-10-01T09:00:00.000Z" };
    rerender(<InterviewHeader sessionId="session-1" />);
    expect(screen.getByText("Untitled")).not.toBeNull();
  });

  it("lists only real participant data and omits empty parts", () => {
    hoisted.participants = [
      {
        id: "p1",
        name: "Asha Rao",
        email: "asha@example.com",
        jobTitle: "Staff Engineer",
        organizationName: "Acme",
      },
      {
        id: "p2",
        name: "",
        email: "lee@example.com",
        jobTitle: "",
        organizationName: "",
      },
    ];
    render(<InterviewHeader sessionId="session-1" />);

    expect(screen.getByText(/Asha Rao/).parentElement?.textContent).toContain(
      "Participants: Asha Rao (Staff Engineer · Acme); lee@example.com",
    );
  });

  it("hides the participants line when nobody is linked", () => {
    render(<InterviewHeader sessionId="session-1" />);

    expect(screen.queryByText(/Participants/)).toBeNull();
  });

  it("shows Back only when history allows it and calls goBack", () => {
    const { rerender } = render(<InterviewHeader sessionId="session-1" />);
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();

    hoisted.canGoBack = true;
    rerender(<InterviewHeader sessionId="session-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(hoisted.goBack).toHaveBeenCalledTimes(1);
  });

  it("omits the date when the stored value is not a valid date", () => {
    hoisted.session = { title: "Call", created_at: "not-a-date" };
    hoisted.event = { started_at: "also-bad" };
    const { container } = render(<InterviewHeader sessionId="session-1" />);

    expect(container.querySelector("span.shrink-0")).toBeNull();
  });
});
