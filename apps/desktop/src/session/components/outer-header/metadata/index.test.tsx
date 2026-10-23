import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Popover } from "@anlg/ui/components/ui/popover";

import { DateEditor } from "./date";
import { EventDisplay, MetadataPopoverContent } from "./index";

const mocks = vi.hoisted(() => ({
  createdAt: "2026-07-02T03:53:00.000Z" as unknown,
  setCreatedAt: vi.fn(),
  openUrl: vi.fn(),
  sessionEvent: null as unknown,
}));

const lingui = vi.hoisted(() => {
  const t = (input: TemplateStringsArray | string, ...values: unknown[]) => {
    if (typeof input === "string") {
      return input;
    }

    return Array.from(input).reduce(
      (text, part, index) => `${text}${part}${values[index] ?? ""}`,
      "",
    );
  };

  return { t };
});

vi.mock("@lingui/react/macro", () => ({
  useLingui: () => ({
    t: lingui.t,
  }),
}));

vi.mock("@anlg/plugin-opener2", () => ({
  commands: {
    openUrl: mocks.openUrl,
  },
}));

vi.mock("~/shared/hooks/useTimeFormat", () => ({
  useTimeFormat: () => "h:mm a",
}));

vi.mock("~/shared/config", () => ({
  useConfigValue: () => undefined,
}));

vi.mock("~/session/hooks/useSessionEvent", () => ({
  useSessionEvent: () => mocks.sessionEvent,
}));

vi.mock("~/session/queries", () => ({
  useSession: () => ({ created_at: mocks.createdAt }),
  useUpdateSession: () => mocks.setCreatedAt,
}));

vi.mock("./participants", () => ({
  ParticipantsDisplay: () => null,
}));

describe("Metadata controls", () => {
  beforeEach(() => {
    mocks.createdAt = "2026-07-02T03:53:00.000Z";
    mocks.setCreatedAt.mockClear();
    mocks.openUrl.mockClear();
    mocks.sessionEvent = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("uses a narrow floating panel", () => {
    render(
      <Popover open>
        <MetadataPopoverContent sessionId="session-1" />
      </Popover>,
    );

    const content = screen
      .getByRole("button", { name: "Edit date" })
      .closest("[data-radix-popper-content-wrapper] > *");

    expect(content?.className.split(/\s+/) ?? []).toContain("w-72");
  });

  it("renders date edit action buttons as circles", () => {
    render(<DateEditor sessionId="session-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Edit date" }));

    expect(
      screen.getByRole("button", { name: "Cancel date edit" }).className,
    ).toContain("rounded-full");
    expect(
      screen.getByRole("button", { name: "Save date" }).className,
    ).toContain("rounded-full");
  });

  it("keeps date edit actions available in the narrow panel", () => {
    render(
      <Popover open>
        <MetadataPopoverContent sessionId="session-1" />
      </Popover>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit date" }));

    const input = document.querySelector('input[type="datetime-local"]');
    const actions = screen.getByRole("button", {
      name: "Save date",
    }).parentElement;

    expect(input).not.toBeNull();
    expect(input?.className).toContain("w-full");
    expect(input?.className).toContain("min-w-0");
    expect(actions?.className).toContain("shrink-0");
    expect(actions?.className).toContain("justify-end");
    expect(actions?.parentElement?.className).toContain("flex-col");
    expect(
      screen.getByRole("button", { name: "Cancel date edit" }),
    ).not.toBeNull();
  });

  it("hides the stale demo link on existing welcome sessions", () => {
    render(
      <EventDisplay
        event={{
          title: "Welcome to Abrish AI",
          startedAt: undefined,
          endedAt: undefined,
          location: undefined,
          meetingLink: "https://anarlog.so/onboarding-demo/",
          trackingId: "anarlog-onboarding-demo-v1",
          description: undefined,
          calendarId: undefined,
        }}
      />,
    );

    expect(screen.queryByText("anarlog.so")).toBeNull();
    expect(screen.queryByRole("button", { name: "Join" })).toBeNull();
  });

  it("keeps ordinary meeting links available", () => {
    render(
      <EventDisplay
        event={{
          title: "Design review",
          startedAt: undefined,
          endedAt: undefined,
          location: undefined,
          meetingLink: "https://meet.google.com/abc-defg-hij",
          description: undefined,
          calendarId: undefined,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Join" }));

    expect(mocks.openUrl).toHaveBeenCalledWith(
      "https://meet.google.com/abc-defg-hij",
      null,
    );
  });
});
