import assert from "node:assert/strict";
import test from "node:test";

import { sessionView } from "./session-view.ts";

const meeting = {
  sessionId: "meeting-1",
  active: true,
  hasRecordingHistory: false,
  hasSummary: false,
  hasTranscript: false,
  selection: null,
};

test("recording opens editable memos and keeps transcript in the main tabs", () => {
  const view = sessionView(meeting);
  assert.deepEqual(view.tabs, [{ type: "raw" }, { type: "transcript" }]);
  assert.equal(view.current.type, "raw");
  assert.equal(view.selectedIndex, 0);
});

test("stopping a meeting opens Summary even when the live Transcript was selected", () => {
  const selection = {
    sessionId: meeting.sessionId,
    active: true,
    view: { type: "transcript" },
  };
  assert.equal(
    sessionView({ ...meeting, selection }).current.type,
    "transcript",
  );
  const stopped = sessionView({
    ...meeting,
    selection,
    active: false,
    hasRecordingHistory: true,
  });
  assert.deepEqual(
    stopped.tabs.map((tab) => tab.type),
    ["enhanced", "raw", "transcript"],
  );
  assert.equal(stopped.current.type, "enhanced");
  assert.equal(stopped.selectedIndex, 0);
});

test("summary arriving after stopping preserves an explicitly selected Memos tab", () => {
  const view = sessionView({
    ...meeting,
    active: false,
    hasRecordingHistory: true,
    hasSummary: true,
    selection: {
      sessionId: meeting.sessionId,
      active: false,
      view: { type: "raw" },
    },
  });
  assert.equal(view.current.type, "raw");
  assert.equal(view.selectedIndex, 1);
});

test("a plain note has only memos and does not inherit another meeting's selection", () => {
  const view = sessionView({
    ...meeting,
    active: false,
    selection: {
      sessionId: "other-meeting",
      active: false,
      view: { type: "transcript" },
    },
  });
  assert.deepEqual(view.tabs, [{ type: "raw" }]);
  assert.equal(view.current.type, "raw");
});
