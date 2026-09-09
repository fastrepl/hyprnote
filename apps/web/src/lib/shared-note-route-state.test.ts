import assert from "node:assert/strict";
import test from "node:test";

import {
  getInvitationRouteFailure,
  getLinkSharedNoteRouteGate,
  getSharedNoteAccessGate,
} from "./shared-note-route-state.ts";

test("keeps failed invitation acceptance retryable", () => {
  assert.equal(
    getInvitationRouteFailure({
      acceptanceFailed: true,
      inspectionFailed: false,
      inspectionReady: true,
    }),
    "accept-retry",
  );
  assert.equal(
    getInvitationRouteFailure({
      acceptanceFailed: false,
      inspectionFailed: false,
      inspectionReady: true,
    }),
    null,
  );
  assert.equal(
    getInvitationRouteFailure({
      acceptanceFailed: true,
      inspectionFailed: true,
      inspectionReady: false,
    }),
    "unavailable",
  );
});

test("authenticated access outranks continuation failures", () => {
  assert.equal(
    getLinkSharedNoteRouteGate({
      authenticatedNotePending: false,
      continuationFailed: true,
      continuationPending: false,
      hasAuthenticatedNote: true,
      linkSnapshotPending: false,
    }),
    null,
  );
  assert.equal(
    getLinkSharedNoteRouteGate({
      authenticatedNotePending: true,
      continuationFailed: true,
      continuationPending: false,
      hasAuthenticatedNote: false,
      linkSnapshotPending: false,
    }),
    "loading",
  );
  assert.equal(
    getLinkSharedNoteRouteGate({
      authenticatedNotePending: false,
      continuationFailed: true,
      continuationPending: false,
      hasAuthenticatedNote: false,
      linkSnapshotPending: false,
    }),
    "continuation-error",
  );
});

test("signed-out visitors sign in before they can request access", () => {
  assert.equal(
    getSharedNoteAccessGate({ requestStatus: null, signedIn: false }),
    "sign-in",
  );
  assert.equal(
    getSharedNoteAccessGate({ requestStatus: "pending", signedIn: false }),
    "sign-in",
  );
});

test("signed-in visitors see their latest access request state", () => {
  assert.equal(
    getSharedNoteAccessGate({ requestStatus: null, signedIn: true }),
    "request",
  );
  assert.equal(
    getSharedNoteAccessGate({ requestStatus: "pending", signedIn: true }),
    "pending",
  );
  assert.equal(
    getSharedNoteAccessGate({ requestStatus: "approved", signedIn: true }),
    "approved",
  );
  assert.equal(
    getSharedNoteAccessGate({ requestStatus: "denied", signedIn: true }),
    "request",
  );
  assert.equal(
    getSharedNoteAccessGate({ requestStatus: "cancelled", signedIn: true }),
    "request",
  );
});
