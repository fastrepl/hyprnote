import assert from "node:assert/strict";
import test from "node:test";

import {
  forgetAuthFlowContext,
  redirectRootAuthReturn,
  rememberAuthFlowContext,
} from "./root-auth-callback.ts";

test("sends expired mobile and desktop OAuth returns on the homepage back to app sign-in", () => {
  const storage = new Map<string, string>();
  let destination = "";
  const state = "848f5d8c-14ac-4384-b40b-482a7315cd25";
  const location = {
    pathname: "/",
    search: "",
    replace: (url: string) => {
      destination = url;
    },
  };
  Object.assign(globalThis, {
    window: {
      location,
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    },
    document: { documentElement: { style: {} } },
  });
  try {
    location.search =
      "?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+parameter+is+invalid";
    for (const scheme of ["anarlog-dev", "anarlog"] as const) {
      rememberAuthFlowContext(
        { flow: "desktop", scheme, desktop_state: state },
        1_000,
      );
      assert.equal(redirectRootAuthReturn(6 * 60_000), true);
      const url = new URL(destination, "https://anarlog.so");
      assert.equal(url.pathname, "/auth");
      assert.deepEqual(Object.fromEntries(url.searchParams), {
        flow: "desktop",
        scheme,
        desktop_state: state,
      });
    }

    location.search =
      "?token_hash=abc&type=email&redirect_to=https%3A%2F%2Fanarlog.so%2Fcallback%2Fauth%3Fflow%3Ddesktop";
    rememberAuthFlowContext({ flow: "desktop", scheme: "anarlog" }, 1_000);
    assert.equal(redirectRootAuthReturn(2_000), true);
    assert.equal(destination, `/confirm-auth/${location.search}`);

    location.search = "?code=abc";
    rememberAuthFlowContext({ flow: "desktop", scheme: "anarlog" }, 1_000);
    assert.equal(redirectRootAuthReturn(2_000), true);
    assert.equal(destination, "/callback/auth/?code=abc");

    location.search = "?error=access_denied";
    rememberAuthFlowContext({ flow: "desktop", scheme: "anarlog" }, 1_000);
    forgetAuthFlowContext();
    assert.equal(redirectRootAuthReturn(2_000), true);
    assert.equal(destination, "/auth?flow=web");

    location.pathname = "/callback/auth/";
    destination = "";
    assert.equal(redirectRootAuthReturn(2_000), false);
    assert.equal(destination, "");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "document");
  }
});
