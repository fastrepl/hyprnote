import type { Session, User } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import test from "node:test";

import {
  completeIdentityLink,
  identityLinkAccountError,
  identityLinkError,
} from "./identity-link.ts";

const user = {
  id: "original",
  identities: [{ provider: "google" }, { provider: "apple" }],
} as User;
const session = {
  user,
  access_token: "access",
  refresh_token: "refresh",
} as Session;

function fixture(
  overrides: Partial<Parameters<typeof completeIdentityLink>[0]> = {},
) {
  const calls: string[] = [];
  return {
    calls,
    input: {
      pending: {
        userId: user.id,
        provider: "apple",
        state: "nonce",
        createdAt: 1000,
      },
      state: "nonce",
      code: "code",
      now: 2000,
      getUser: async () => {
        calls.push("getUser");
        return user;
      },
      exchange: async () => {
        calls.push("exchange");
        return { session };
      },
      saveSession: async (value: Session) => {
        calls.push("save");
        assert.equal(value.user.id, user.id);
        return true;
      },
      ...overrides,
    },
  };
}

test("linking refreshes the original account only after verifying its identity", async () => {
  const { calls, input } = fixture();
  assert.equal(await completeIdentityLink(input), "connected");
  assert.deepEqual(calls, ["getUser", "exchange", "save"]);
});

test("missing, replaced, expired, and future requests never exchange a code", async () => {
  for (const override of [
    { pending: null },
    { state: "other" },
    { state: undefined },
    { now: 901001 },
    { now: 999 },
  ]) {
    const { calls, input } = fixture(override);
    assert.equal(await completeIdentityLink(input), "expired");
    assert.deepEqual(calls, []);
  }
});

test("signing out or switching browser accounts during OAuth prevents exchange", async () => {
  for (const [current, expected] of [
    [null, "signed_out"],
    [{ ...user, id: "other" }, "account_mismatch"],
  ] as const) {
    const { calls, input } = fixture({ getUser: async () => current });
    assert.equal(await completeIdentityLink(input), expected);
    assert.deepEqual(calls, []);
  }
});

test("anonymous and SSO accounts cannot start or complete a connection", async () => {
  for (const current of [
    { ...user, is_anonymous: true },
    { ...user, is_sso_user: true },
  ]) {
    assert.equal(identityLinkAccountError(current, user.id), "unsupported");
    const { calls, input } = fixture({ getUser: async () => current });
    assert.equal(await completeIdentityLink(input), "unsupported");
    assert.deepEqual(calls, []);
  }
});

test("canceling or using an identity owned by another account preserves the session", async () => {
  for (const [error, expected] of [
    ["access_denied", "canceled"],
    ["identity_already_exists", "identity_already_exists"],
    ["manual_linking_disabled", "unavailable"],
  ] as const) {
    const { calls, input } = fixture({ error });
    assert.equal(await completeIdentityLink(input), expected);
    assert.deepEqual(calls, ["getUser"]);
  }
});

test("an exchange that returns another account never overwrites the browser session", async () => {
  const { calls, input } = fixture({
    exchange: async () => ({
      session: { ...session, user: { ...user, id: "other" } },
    }),
  });
  assert.equal(await completeIdentityLink(input), "account_mismatch");
  assert.deepEqual(calls, ["getUser"]);
});

test("a missing provider or failed exchange is never reported as connected", async () => {
  for (const exchange of [
    async () => ({
      session: { ...session, user: { ...user, identities: [] } },
    }),
    async () => ({ session: null, errorCode: "unknown" }),
  ]) {
    const { calls, input } = fixture({ exchange });
    assert.equal(await completeIdentityLink(input), "failed");
    assert.deepEqual(calls, ["getUser"]);
  }
});

test("missing codes and persistence failures are recoverable errors", async () => {
  const missing = fixture({ code: undefined });
  assert.equal(await completeIdentityLink(missing.input), "failed");
  assert.deepEqual(missing.calls, ["getUser"]);
  assert.equal(
    await completeIdentityLink(
      fixture({ saveSession: async () => false }).input,
    ),
    "failed",
  );
  assert.equal(identityLinkError("untrusted provider text"), "failed");
});
