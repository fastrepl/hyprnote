import assert from "node:assert/strict";
import test from "node:test";

import { MobileSyncController } from "./controller.ts";

const session = {
  apiUrl: "https://api.anarlog.test",
  accessToken: "access-token",
  accountUserId: "user-123",
};

const status = {
  configured: true,
  running: true,
  has_unsent_changes: false,
  last_sync_at_ms: 1234,
  last_error: null,
  consecutive_failures: 0,
};

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail("condition was not reached");
}

const instantSettle = { intervalMs: 0, timeoutMs: 0 };

function dependencies(overrides = {}) {
  return {
    readRecoveryKey: async () => "recovery-key",
    saveRecoveryKey: async () => {},
    deleteRecoveryKey: async () => {},
    generateRecoveryKey: async () => "generated-recovery-key",
    inspectRecoveryKey: async () => ({
      keyId: "ABCDEFGHIJKLMNOPQRSTUV",
      memberPublicKey: "A".repeat(43),
    }),
    claimIdentity: async () => {},
    getDevice: async () => ({ fingerprint: "device-1234" }),
    enrollDevice: async () => ({ status: "first_device" }),
    bootstrap: async () => "configured",
    shareEnrollments: async () => {},
    stop: async () => {},
    syncNow: async () => {},
    getStatus: async () => status,
    reportError: () => {},
    ...overrides,
  };
}

test("silently establishes encryption for the first device", async () => {
  let saved;
  let claimCount = 0;
  let bootstrapKey;
  const controller = new MobileSyncController(
    dependencies({
      readRecoveryKey: async () => null,
      saveRecoveryKey: async (_accountUserId, recoveryKey) => {
        saved = recoveryKey;
      },
      claimIdentity: async () => {
        claimCount += 1;
      },
      bootstrap: async (_session, recoveryKey) => {
        bootstrapKey = recoveryKey;
        return "configured";
      },
    }),
    0,
    0,
    undefined,
    instantSettle,
  );
  controller.activate(session);

  await waitFor(() => controller.getSnapshot().phase === "ready");
  assert.equal(saved, "generated-recovery-key");
  assert.equal(bootstrapKey, "generated-recovery-key");
  assert.equal(claimCount, 1);
});

test("boots the native replica with the stored account key", async () => {
  let bootstrapArguments;
  const controller = new MobileSyncController(
    dependencies({
      bootstrap: async (...args) => {
        bootstrapArguments = args;
        return "configured";
      },
    }),
    0,
    0,
    undefined,
    instantSettle,
  );
  controller.activate(session);

  await waitFor(() => controller.getSnapshot().phase === "ready");
  assert.deepEqual(bootstrapArguments, [
    session,
    "recovery-key",
    { fingerprint: "device-1234" },
  ]);
  assert.deepEqual(controller.getSnapshot(), {
    phase: "ready",
    accountUserId: "user-123",
    hasRecoveryKey: true,
    running: true,
    syncingNow: false,
    hasUnsentChanges: false,
    lastSyncAtMs: 1234,
    errorMessage: null,
    consecutiveFailures: 0,
  });
});

test("ignores a stale activation before booting the next account", async () => {
  let resolveFirstRead;
  const readRecoveryKey = (accountUserId) => {
    if (accountUserId === "user-123") {
      return new Promise((resolve) => {
        resolveFirstRead = resolve;
      });
    }
    return Promise.resolve("second-key");
  };
  const bootstrappedAccounts = [];
  const controller = new MobileSyncController(
    dependencies({
      readRecoveryKey,
      bootstrap: async (activeSession) => {
        bootstrappedAccounts.push(activeSession.accountUserId);
        return "configured";
      },
    }),
    0,
    0,
    undefined,
    instantSettle,
  );
  controller.activate(session);
  await waitFor(() => resolveFirstRead !== undefined);
  controller.activate({ ...session, accountUserId: "user-456" });
  resolveFirstRead("first-key");

  await waitFor(() => controller.getSnapshot().phase === "ready");
  assert.deepEqual(bootstrappedAccounts, ["user-456"]);
});

test("keeps working locally while another device approves enrollment", async () => {
  let saved = null;
  let claimCount = 0;
  const controller = new MobileSyncController(
    dependencies({
      readRecoveryKey: async () => null,
      saveRecoveryKey: async (_accountUserId, recoveryKey) => {
        saved = recoveryKey;
      },
      enrollDevice: async () => ({ status: "pending" }),
      claimIdentity: async () => {
        claimCount += 1;
      },
    }),
    0,
    0,
    undefined,
    instantSettle,
  );
  controller.activate(session);

  await waitFor(() => controller.getSnapshot().phase === "approval_pending");
  assert.equal(saved, null);
  assert.equal(claimCount, 0);
  assert.equal(controller.getSnapshot().running, false);
});

test("rolls back secure storage when the server rejects a new identity", async () => {
  let saved = null;
  let deleted = false;
  const controller = new MobileSyncController(
    dependencies({
      readRecoveryKey: async () => saved,
      saveRecoveryKey: async (_accountUserId, recoveryKey) => {
        saved = recoveryKey;
      },
      deleteRecoveryKey: async () => {
        deleted = true;
        saved = null;
      },
      claimIdentity: async () => {
        throw Object.assign(new Error("identity mismatch"), {
          code: "identity_mismatch",
        });
      },
    }),
    0,
    0,
    undefined,
    instantSettle,
  );
  controller.activate(session);
  await waitFor(() => controller.getSnapshot().phase === "approval_pending");
  assert.equal(deleted, true);
  assert.equal(saved, null);
});

test("uses the refreshed session when managed enrollment finishes", async () => {
  let saved = null;
  let claimedAccessToken;
  let bootstrappedAccessToken;
  let firstEnrollmentResolve;
  let enrollmentCalls = 0;
  const controller = new MobileSyncController(
    dependencies({
      readRecoveryKey: async () => saved,
      saveRecoveryKey: async (_accountUserId, recoveryKey) => {
        saved = recoveryKey;
      },
      claimIdentity: async (activeSession) => {
        claimedAccessToken = activeSession.accessToken;
      },
      enrollDevice: async () => {
        enrollmentCalls += 1;
        if (enrollmentCalls === 1) {
          return await new Promise((resolve) => {
            firstEnrollmentResolve = resolve;
          });
        }
        return {
          status: "recovered",
          recoveryKey: "approved-recovery-key",
          completeEnrollment: async () => {},
        };
      },
      bootstrap: async (activeSession) => {
        bootstrappedAccessToken = activeSession.accessToken;
        return "configured";
      },
    }),
    0,
    0,
    undefined,
    instantSettle,
  );
  controller.activate(session);
  await waitFor(() => firstEnrollmentResolve !== undefined);

  controller.activate({ ...session, accessToken: "refreshed-token" });
  firstEnrollmentResolve({ status: "pending" });
  await waitFor(() => controller.getSnapshot().phase === "ready");

  assert.equal(saved, "approved-recovery-key");
  assert.equal(claimedAccessToken, "refreshed-token");
  assert.equal(bootstrappedAccessToken, "refreshed-token");
});

test("keeps a recovered enrollment reusable until identity claim succeeds", async () => {
  let saved = null;
  let enrollmentCompleted = false;
  const controller = new MobileSyncController(
    dependencies({
      readRecoveryKey: async () => saved,
      saveRecoveryKey: async (_accountUserId, recoveryKey) => {
        saved = recoveryKey;
      },
      deleteRecoveryKey: async () => {
        saved = null;
      },
      enrollDevice: async () => ({
        status: "recovered",
        recoveryKey: "approved-recovery-key",
        completeEnrollment: async () => {
          enrollmentCompleted = true;
        },
      }),
      claimIdentity: async () => {
        throw Object.assign(new Error("identity mismatch"), {
          code: "identity_mismatch",
        });
      },
    }),
    0,
    0,
    undefined,
    instantSettle,
  );
  controller.activate(session);

  await waitFor(() => controller.getSnapshot().phase === "identity_mismatch");
  assert.equal(saved, null);
  assert.equal(enrollmentCompleted, false);
});

test("does not leave a stale poll interval after re-activation", async () => {
  let nextTimerId = 0;
  const intervals = new Map();
  const timeouts = new Map();
  const timers = {
    setInterval: (callback) => {
      nextTimerId += 1;
      intervals.set(nextTimerId, callback);
      return nextTimerId;
    },
    clearInterval: (id) => {
      intervals.delete(id);
    },
    setTimeout: (callback) => {
      nextTimerId += 1;
      timeouts.set(nextTimerId, callback);
      return nextTimerId;
    },
    clearTimeout: (id) => {
      timeouts.delete(id);
    },
  };
  let statusCalls = 0;
  let resolveFirstStatus;
  const controller = new MobileSyncController(
    dependencies({
      getStatus: async () => {
        statusCalls += 1;
        if (statusCalls === 1) {
          return await new Promise((resolve) => {
            resolveFirstStatus = resolve;
          });
        }
        return status;
      },
    }),
    5_000,
    0,
    timers,
  );
  controller.activate(session);
  await waitFor(() => resolveFirstStatus !== undefined);

  controller.activate({ ...session, accessToken: "refreshed-token" });
  resolveFirstStatus(status);
  await waitFor(() => controller.getSnapshot().phase === "ready");
  assert.equal(intervals.size, 1);

  controller.suspend();
  await waitFor(() => controller.getSnapshot().phase === "inactive");
  assert.equal(intervals.size, 0);
});

test("stops native sync when the account lifecycle ends", async () => {
  let stopCount = 0;
  const controller = new MobileSyncController(
    dependencies({
      stop: async () => {
        stopCount += 1;
      },
    }),
    0,
    0,
    undefined,
    instantSettle,
  );
  controller.activate(session);
  await waitFor(() => controller.getSnapshot().phase === "ready");

  controller.suspend();
  await waitFor(() => stopCount === 2);
  assert.equal(controller.getSnapshot().phase, "inactive");
  assert.equal(controller.getSnapshot().accountUserId, session.accountUserId);
  assert.equal(controller.getSnapshot().hasRecoveryKey, true);
});

test("preserves enrollment only for same-account restarts", async () => {
  const controller = new MobileSyncController(dependencies(), 0, 0);
  controller.activate(session);
  await waitFor(() => controller.getSnapshot().phase === "ready");

  controller.suspend();
  assert.deepEqual(
    {
      phase: controller.getSnapshot().phase,
      accountUserId: controller.getSnapshot().accountUserId,
      hasRecoveryKey: controller.getSnapshot().hasRecoveryKey,
    },
    {
      phase: "inactive",
      accountUserId: "user-123",
      hasRecoveryKey: true,
    },
  );

  controller.activate({ ...session, accessToken: "refreshed-token" });
  assert.equal(controller.getSnapshot().hasRecoveryKey, true);

  controller.activate({ ...session, accountUserId: "user-456" });
  assert.equal(controller.getSnapshot().accountUserId, "user-456");
  assert.equal(controller.getSnapshot().hasRecoveryKey, false);
});

test("coalesces foreground and manual sync requests while one is active", async () => {
  let syncCount = 0;
  let finishSync;
  const controller = new MobileSyncController(
    dependencies({
      syncNow: async () => {
        syncCount += 1;
        await new Promise((resolve) => {
          finishSync = resolve;
        });
      },
    }),
    0,
    0,
    undefined,
    instantSettle,
  );
  controller.activate(session);
  await waitFor(() => controller.getSnapshot().phase === "ready");

  const foregroundSync = controller.syncNow();
  const manualSync = controller.syncNow();
  await waitFor(() => finishSync !== undefined);
  assert.equal(syncCount, 1);
  assert.equal(controller.getSnapshot().syncingNow, true);

  let manualSettled = false;
  void manualSync.then(() => {
    manualSettled = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(manualSettled, false);

  finishSync();
  await Promise.all([foregroundSync, manualSync]);
  assert.equal(manualSettled, true);
  assert.equal(controller.getSnapshot().syncingNow, false);
});

test("sync-now waits for the queued replica round to record a result", async () => {
  let statusCalls = 0;
  const controller = new MobileSyncController(
    dependencies({
      getStatus: async () => {
        statusCalls += 1;
        return statusCalls >= 4 ? { ...status, last_sync_at_ms: 5678 } : status;
      },
    }),
    0,
    0,
    undefined,
    { intervalMs: 0, timeoutMs: 5_000 },
  );
  controller.activate(session);
  await waitFor(() => controller.getSnapshot().phase === "ready");

  await controller.syncNow();
  assert.equal(controller.getSnapshot().lastSyncAtMs, 5678);
  assert.equal(controller.getSnapshot().syncingNow, false);
});

test("re-activation does not hand the new session a stale in-flight sync", async () => {
  let syncCount = 0;
  let finishFirstSync;
  const controller = new MobileSyncController(
    dependencies({
      syncNow: async () => {
        syncCount += 1;
        if (syncCount === 1) {
          await new Promise((resolve) => {
            finishFirstSync = resolve;
          });
        }
      },
    }),
    0,
    0,
    undefined,
    instantSettle,
  );
  controller.activate(session);
  await waitFor(() => controller.getSnapshot().phase === "ready");

  const staleSync = controller.syncNow();
  await waitFor(() => finishFirstSync !== undefined);

  controller.activate({ ...session, accountUserId: "user-2" });
  await waitFor(() => controller.getSnapshot().phase === "ready");
  assert.equal(controller.getSnapshot().syncingNow, false);

  await controller.syncNow();
  assert.equal(syncCount, 2);
  assert.equal(controller.getSnapshot().syncingNow, false);

  finishFirstSync();
  await staleSync;
  assert.equal(controller.getSnapshot().syncingNow, false);
});

test("shares keys once sync is ready and cancels sharing on sign-out", async () => {
  let activeSignal;
  let sharedSession;
  const controller = new MobileSyncController(
    dependencies({
      shareEnrollments: async (session, signal) => {
        sharedSession = session;
        activeSignal = signal;
        await new Promise((resolve) =>
          signal.addEventListener("abort", resolve),
        );
      },
    }),
    0,
    0,
    undefined,
    instantSettle,
  );
  const stop = controller.activate(session);
  await waitFor(() => activeSignal !== undefined);
  assert.deepEqual(sharedSession, session);
  stop();
  assert.equal(activeSignal.aborted, true);
});

test("retains the first-device key when the claim response is lost", async () => {
  let saved = null;
  let bootstrapKey;
  const controller = new MobileSyncController(
    dependencies({
      readRecoveryKey: async () => saved,
      saveRecoveryKey: async (_account, key) => {
        saved = key;
      },
      deleteRecoveryKey: async () => {
        saved = null;
      },
      claimIdentity: async () => {
        throw new Error("response lost");
      },
      bootstrap: async (_session, key) => {
        bootstrapKey = key;
        return "configured";
      },
    }),
    0,
    0,
    undefined,
    instantSettle,
  );
  controller.activate(session);
  await waitFor(() => controller.getSnapshot().phase === "error");
  assert.equal(saved, "generated-recovery-key");
  controller.retry();
  await waitFor(() => controller.getSnapshot().phase === "ready");
  assert.equal(bootstrapKey, "generated-recovery-key");
  controller.suspend();
});

test("sync activity stays bounded and excludes credentials across account changes", async () => {
  let failing = true;
  const controller = new MobileSyncController(
    dependencies({
      syncNow: async () => {
        if (failing)
          throw new Error(
            "E2EE witness request failed: Bearer secret-token https://private.example/note",
          );
      },
    }),
    0,
    0,
    undefined,
    instantSettle,
  );
  controller.activate(session);
  await waitFor(() => controller.getSnapshot().phase === "ready");
  await controller.syncNow();
  assert.ok(
    controller.getActivity().some((entry) => entry.status.errorMessage),
  );
  const serialized = JSON.stringify(controller.getActivity());
  for (const sensitive of [
    "secret-token",
    "private.example",
    session.accountUserId,
    "recovery-key",
  ]) {
    assert.equal(serialized.includes(sensitive), false);
  }
  failing = false;
  for (let attempt = 0; attempt < 30; attempt += 1) await controller.syncNow();
  assert.equal(controller.getActivity().length, 50);
  assert.equal(controller.getActivity()[0].status.errorMessage, null);

  controller.activate({ ...session, accountUserId: "another-user" });
  assert.equal(controller.getActivity().length, 1);
  assert.equal(controller.getActivity()[0].status.phase, "starting");
  await waitFor(() => controller.getSnapshot().phase === "ready");
  controller.suspend();
});

test("sync activity records later background successes without duplicating unchanged polls", async () => {
  let poll;
  let lastSyncAtMs = 1000;
  const controller = new MobileSyncController(
    dependencies({
      getStatus: async () => ({ ...status, last_sync_at_ms: lastSyncAtMs }),
    }),
    5000,
    0,
    {
      setInterval: (callback) => {
        poll = callback;
        return 1;
      },
      clearInterval: () => {},
      setTimeout,
      clearTimeout,
    },
    instantSettle,
  );
  controller.activate(session);
  await waitFor(() => controller.getSnapshot().lastSyncAtMs === 1000);
  const initialCount = controller.getActivity().length;
  lastSyncAtMs = 2000;
  poll();
  await waitFor(() => controller.getSnapshot().lastSyncAtMs === 2000);
  assert.equal(controller.getActivity().length, initialCount + 1);
  assert.equal(controller.getActivity()[0].status.lastSyncAtMs, 2000);
  poll();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.getActivity().length, initialCount + 1);
  controller.suspend();
});
