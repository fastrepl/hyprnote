import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  getScheduledAutoStartAction,
  hasPendingAutoStart,
  SCHEDULED_AUTO_START_GRACE_MS,
  type ScheduledMeetingRow,
  ScheduledMeetingAutoStart,
  selectDueMeetings,
  startScheduledMeeting,
} from "./scheduled-auto-start";

import type { Tab } from "~/store/zustand/tabs";

const mocks = vi.hoisted(() => ({
  canStart: true,
  liveStatus: "inactive",
  getIgnoredEventSets: vi.fn(),
  getOrCreateSessionForEventId: vi.fn(),
  openNew: vi.fn(),
  openUrl: vi.fn(),
  subscribeMeetings: vi.fn(),
  subscribeListener: vi.fn(),
  subscribeTabs: vi.fn(),
  tabs: [] as Tab[],
}));

vi.mock("@anlg/plugin-windows", () => ({
  getCurrentWebviewWindowLabel: () => "main",
}));

vi.mock("~/db", () => ({
  liveQueryClient: { subscribe: mocks.subscribeMeetings },
}));

vi.mock("~/shared/config", () => ({
  useConfigValues: () => ({
    auto_start_scheduled_meetings: true,
    auto_join_scheduled_meetings: true,
  }),
}));

vi.mock("@anlg/plugin-opener2", () => ({
  commands: { openUrl: mocks.openUrl },
}));

vi.mock("~/calendar/ignored-events", () => ({
  getIgnoredEventSets: mocks.getIgnoredEventSets,
}));

vi.mock("~/session/queries", () => ({
  getOrCreateSessionForEventId: mocks.getOrCreateSessionForEventId,
}));

vi.mock("~/store/zustand/listener/instance", () => ({
  listenerStore: {
    getState: () => ({
      canStartLiveSession: () => mocks.canStart,
      live: { status: mocks.liveStatus },
    }),
    subscribe: mocks.subscribeListener,
  },
}));

vi.mock("~/store/zustand/tabs", () => ({
  useTabs: {
    getState: () => ({ openNew: mocks.openNew, tabs: mocks.tabs }),
    subscribe: mocks.subscribeTabs,
  },
}));

const NOW = new Date("2026-05-15T12:00:00.000Z").getTime();

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function meeting(
  id: string,
  offsetMs: number,
  overrides: Partial<ScheduledMeetingRow> = {},
): ScheduledMeetingRow {
  return {
    id,
    started_at: new Date(NOW + offsetMs).toISOString(),
    meeting_link: `https://zoom.us/j/${id}`,
    tracking_id_event: `tracking-${id}`,
    recurrence_series_id: "",
    ...overrides,
  };
}

function select(rows: ScheduledMeetingRow[], firedEventIds: string[] = []) {
  return selectDueMeetings({
    rows,
    nowMs: NOW,
    firedEventIds: new Set(firedEventIds),
  }).map((row) => row.id);
}

describe("selectDueMeetings", () => {
  test("selects a meeting whose start time has just arrived", () => {
    expect(select([meeting("a", 0)])).toEqual(["a"]);
  });

  test("ignores meetings that have not started yet", () => {
    expect(select([meeting("a", 30_000)])).toEqual([]);
  });

  test("selects a meeting that started within the grace window", () => {
    expect(select([meeting("a", -SCHEDULED_AUTO_START_GRACE_MS + 1)])).toEqual([
      "a",
    ]);
  });

  test("ignores meetings that started before the grace window", () => {
    expect(select([meeting("a", -SCHEDULED_AUTO_START_GRACE_MS - 1)])).toEqual(
      [],
    );
  });

  test("ignores meetings that already fired", () => {
    expect(select([meeting("a", 0)], ["a"])).toEqual([]);
  });

  test("orders overlapping meetings by most recent start", () => {
    const rows = [
      meeting("earlier", -4 * 60_000),
      meeting("latest", -30_000),
      meeting("middle", -2 * 60_000),
    ];

    expect(select(rows)).toEqual(["latest", "middle", "earlier"]);
  });

  test("still returns an overlapping meeting when the newest already fired", () => {
    const rows = [meeting("earlier", -60_000), meeting("latest", -30_000)];

    expect(select(rows, ["latest"])).toEqual(["earlier"]);
  });

  test("skips rows with an unparseable start time", () => {
    const rows = [
      meeting("broken", 0, { started_at: "not-a-date" }),
      meeting("good", -60_000),
    ];

    expect(select(rows)).toEqual(["good"]);
  });

  test("treats timezone-naive Graph timestamps as UTC", () => {
    expect(
      select([
        meeting("naive", 0, { started_at: "2026-05-15T12:00:00.0000000" }),
      ]),
    ).toEqual(["naive"]);
  });

  test("returns nothing when no meeting is due", () => {
    expect(select([])).toEqual([]);
  });
});

describe("hasPendingAutoStart", () => {
  const sessionTab = (
    id: string,
    autoStart: boolean | null,
  ): Extract<Tab, { type: "sessions" }> => ({
    type: "sessions",
    id,
    active: true,
    slotId: id,
    pinned: false,
    state: { view: null, autoStart },
  });

  test("blocks another scheduled start while a tab is still arming", () => {
    expect(
      hasPendingAutoStart([
        sessionTab("ready", null),
        sessionTab("arming", true),
      ]),
    ).toBe(true);
  });

  test("allows scheduling after every pending start clears", () => {
    expect(hasPendingAutoStart([sessionTab("ready", null)])).toBe(false);
  });

  test("does not let an inactive pending tab block scheduling", () => {
    expect(
      hasPendingAutoStart([{ ...sessionTab("inactive", true), active: false }]),
    ).toBe(false);
  });
});

describe("startScheduledMeeting", () => {
  beforeEach(() => {
    mocks.canStart = true;
    mocks.liveStatus = "inactive";
    mocks.getIgnoredEventSets.mockReset().mockResolvedValue({
      ignoredIds: new Set<string>(),
      ignoredSeriesIds: new Set<string>(),
    });
    mocks.getOrCreateSessionForEventId
      .mockReset()
      .mockResolvedValue("session-a");
    mocks.openNew.mockReset();
    mocks.openUrl.mockReset().mockResolvedValue({ status: "ok", data: null });
    mocks.subscribeMeetings.mockReset().mockResolvedValue(async () => {});
    mocks.subscribeListener.mockReset().mockReturnValue(() => {});
    mocks.subscribeTabs.mockReset().mockReturnValue(() => {});
    mocks.tabs = [];
  });

  test("opens the meeting link and arms the session when the meeting is due", async () => {
    await expect(startScheduledMeeting(meeting("a", 0), true)).resolves.toBe(
      "started",
    );

    expect(mocks.openUrl).toHaveBeenCalledWith("https://zoom.us/j/a", null);
    expect(mocks.openNew).toHaveBeenCalledWith({
      type: "sessions",
      id: "session-a",
      state: { view: null, autoStart: true },
    });
  });

  test("only arms the session when auto-join is off", async () => {
    await expect(startScheduledMeeting(meeting("a", 0), false)).resolves.toBe(
      "started",
    );

    expect(mocks.openUrl).not.toHaveBeenCalled();
    expect(mocks.openNew).toHaveBeenCalledTimes(1);
  });

  test("does not open the link while the session cannot start yet", async () => {
    mocks.canStart = false;

    await expect(startScheduledMeeting(meeting("a", 0), true)).resolves.toBe(
      "blocked",
    );

    expect(mocks.openUrl).not.toHaveBeenCalled();
    expect(mocks.openNew).not.toHaveBeenCalled();
  });

  test("skips ignored events entirely", async () => {
    mocks.getIgnoredEventSets.mockResolvedValue({
      ignoredIds: new Set(["tracking-a"]),
      ignoredSeriesIds: new Set<string>(),
    });

    await expect(startScheduledMeeting(meeting("a", 0), true)).resolves.toBe(
      "ignored",
    );

    expect(mocks.openUrl).not.toHaveBeenCalled();
    expect(mocks.openNew).not.toHaveBeenCalled();
  });

  test("ignores the next meeting while the previous recording runs overtime", async () => {
    mocks.liveStatus = "active";

    await expect(startScheduledMeeting(meeting("a", 0), true)).resolves.toBe(
      "ignored",
    );

    expect(mocks.getOrCreateSessionForEventId).not.toHaveBeenCalled();
    expect(mocks.openUrl).not.toHaveBeenCalled();
    expect(mocks.openNew).not.toHaveBeenCalled();
  });

  test("ignores a recording that becomes active while the calendar lookup is pending", async () => {
    mocks.getIgnoredEventSets.mockImplementation(async () => {
      mocks.liveStatus = "active";
      return { ignoredIds: new Set(), ignoredSeriesIds: new Set() };
    });

    await expect(startScheduledMeeting(meeting("a", 0), true)).resolves.toBe(
      "ignored",
    );

    expect(mocks.getOrCreateSessionForEventId).not.toHaveBeenCalled();
    expect(mocks.openUrl).not.toHaveBeenCalled();
    expect(mocks.openNew).not.toHaveBeenCalled();
  });

  test("does not queue or join a meeting if recording starts during session creation", async () => {
    mocks.getOrCreateSessionForEventId.mockImplementation(async () => {
      mocks.liveStatus = "active";
      mocks.canStart = false;
      return "session-a";
    });

    await expect(startScheduledMeeting(meeting("a", 0), true)).resolves.toBe(
      "ignored",
    );

    expect(mocks.openUrl).not.toHaveBeenCalled();
    expect(mocks.openNew).not.toHaveBeenCalled();
  });

  test("an overlapping meeting stays skipped after a pending tab and the active recording clear", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mocks.liveStatus = "active";
    mocks.tabs = [
      {
        type: "sessions",
        id: "pending",
        slotId: "pending",
        active: true,
        pinned: false,
        state: { view: null, autoStart: true },
      },
    ];
    render(createElement(ScheduledMeetingAutoStart));
    mocks.subscribeMeetings.mock.calls[0][2].onData([meeting("a", 0)]);

    mocks.liveStatus = "inactive";
    mocks.tabs = [];
    mocks.subscribeTabs.mock.calls[0][0]();
    await vi.advanceTimersByTimeAsync(15_000);

    expect(mocks.getOrCreateSessionForEventId).not.toHaveBeenCalled();
    expect(mocks.openUrl).not.toHaveBeenCalled();
    expect(mocks.openNew).not.toHaveBeenCalled();
  });
});

describe("getScheduledAutoStartAction", () => {
  test("starts when no live session is active", () => {
    expect(getScheduledAutoStartAction("inactive")).toBe("start");
  });

  test("retries while a live session is finalizing", () => {
    expect(getScheduledAutoStartAction("finalizing")).toBe("retry");
  });

  test("skips when a live session is active", () => {
    expect(getScheduledAutoStartAction("active")).toBe("skip");
  });
});
