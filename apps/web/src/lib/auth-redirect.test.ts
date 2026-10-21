import assert from "node:assert/strict";
import test from "node:test";

import {
  addInternalReturnPathSearch,
  buildPostAuthDestination,
  DEFAULT_AUTH_RETURN_PATH,
  sanitizeInternalReturnPath,
  toAbsoluteInternalReturnUrl,
} from "./auth-redirect.ts";

test("accepts only internal paths with one leading slash", () => {
  assert.equal(
    sanitizeInternalReturnPath("/share/invite/abc/?scheme=hyprnote#note"),
    "/share/invite/abc/?scheme=hyprnote#note",
  );

  for (const value of [
    undefined,
    "",
    "share/invite/abc",
    "//attacker.example/share",
    "/\\attacker.example/share",
    "https://anarlog.so/share",
    "javascript:alert(1)",
  ]) {
    assert.equal(sanitizeInternalReturnPath(value), DEFAULT_AUTH_RETURN_PATH);
  }
});

test("new web accounts bypass Anarlog checkout and preserve the safe return path", () => {
  assert.equal(
    buildPostAuthDestination({
      newAccount: true,
      returnTo: "/share/invite/abc/?scheme=hyprnote",
    }),
    "/share/invite/abc/?scheme=hyprnote",
  );
});

test("returning users bypass checkout and unsafe redirects fall back", () => {
  assert.equal(
    buildPostAuthDestination({
      newAccount: false,
      returnTo: "/share/invite/abc/",
    }),
    "/share/invite/abc/",
  );
  assert.equal(
    buildPostAuthDestination({
      newAccount: false,
      returnTo: "//attacker.example",
    }),
    DEFAULT_AUTH_RETURN_PATH,
  );
});

test("sign-in preserves the app account and connected section without a URL fragment", () => {
  const returnTo =
    "/app/account?section=connected-accounts&account_user_id=00000000-0000-4000-8000-000000000001";
  assert.equal(
    buildPostAuthDestination({ newAccount: false, returnTo }),
    returnTo,
  );
});

test("checkout results preserve invitation query and hash state", () => {
  assert.equal(
    addInternalReturnPathSearch("/share/invite/abc/?scheme=hyprnote#note", {
      checkout: "canceled",
      checkout_type: "trial",
      source: "onboarding",
    }),
    "/share/invite/abc/?scheme=hyprnote&checkout=canceled&checkout_type=trial&source=onboarding#note",
  );
});

test("absolute Stripe return URLs cannot change the app origin", () => {
  assert.equal(
    toAbsoluteInternalReturnUrl(
      "https://anarlog.so",
      "/share/invite/abc/?scheme=hyprnote",
    ),
    "https://anarlog.so/share/invite/abc/?scheme=hyprnote",
  );
  assert.equal(
    toAbsoluteInternalReturnUrl(
      "https://anarlog.so",
      "//attacker.example/share",
    ),
    "https://anarlog.so/app/account/",
  );
});
