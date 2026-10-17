import assert from "node:assert/strict";
import test from "node:test";

import {
  rememberAuthFlowContext,
  restoreRootAuthCallback,
} from "./root-auth-callback.ts";

test("recovers expired mobile and desktop OAuth returns before the prerendered homepage hydrates", () => {
  const storage = new Map<string, string>();
  let destination = "";
  const state = "848f5d8c-14ac-4384-b40b-482a7315cd25";
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        pathname: "/",
        search:
          "?error=server_error&error_code=bad_oauth_state&error_description=OAuth+state+not+found+or+expired",
        replace: (url: string) => {
          destination = url;
        },
      },
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    },
  });
  try {
    for (const scheme of ["anarlog-dev", "anarlog"] as const) {
      rememberAuthFlowContext(
        { flow: "desktop", scheme, desktop_state: state },
        1_000,
      );
      assert.equal(restoreRootAuthCallback(6 * 60_000), true);
      const url = new URL(destination, "https://anarlog.so");
      assert.equal(url.pathname, "/callback/auth/");
      assert.equal(url.searchParams.get("flow"), "desktop");
      assert.equal(url.searchParams.get("scheme"), scheme);
      assert.equal(url.searchParams.get("desktop_state"), state);
      assert.equal(url.searchParams.get("error_code"), "bad_oauth_state");
      assert.equal(
        url.searchParams.get("error_description"),
        "OAuth state not found or expired",
      );
    }
    window.location.pathname = "/callback/auth/";
    destination = "";
    assert.equal(restoreRootAuthCallback(6 * 60_000), false);
    assert.equal(destination, "");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});
