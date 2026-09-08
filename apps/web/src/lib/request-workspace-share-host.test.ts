import assert from "node:assert/strict";
import test from "node:test";

import {
  getRequestHost,
  getWorkspaceShareSlugFromHeaders,
} from "./request-workspace-share-host.ts";

test("preserves the workspace host when Netlify replaces forwarded headers", () => {
  const headers = new Headers({
    host: "anarlog.so",
    "x-forwarded-host": "anarlog.so",
    "x-anarlog-workspace-share-host": "fastrepl.anarlog.so",
    "x-anarlog-workspace-share-token": "test-secret",
  });

  assert.equal(getRequestHost(headers, "test-secret"), "fastrepl.anarlog.so");
  assert.equal(
    getWorkspaceShareSlugFromHeaders(headers, "test-secret"),
    "fastrepl",
  );
});

test("ignores workspace headers without the configured proxy secret", () => {
  for (const host of ["anarlog.so", "www.anarlog.so", "anarlog.vercel.app"]) {
    for (const token of [undefined, "wrong-secret"]) {
      const headers = new Headers({
        host,
        "x-forwarded-host": host,
        "x-anarlog-workspace-share-host": "fastrepl.anarlog.so",
      });
      if (token) headers.set("x-anarlog-workspace-share-token", token);
      assert.equal(getRequestHost(headers, "test-secret"), host);
      assert.equal(
        getWorkspaceShareSlugFromHeaders(headers, "test-secret"),
        null,
      );
    }
  }

  const headers = new Headers({
    host: "anarlog.so",
    "x-anarlog-workspace-share-host": "fastrepl.anarlog.so",
    "x-anarlog-workspace-share-token": "test-secret",
  });
  assert.equal(getRequestHost(headers), "anarlog.so");
});

test("reads the workspace slug from the Cloudflare forwarded host", () => {
  const headers = new Headers({
    host: "anarlog.so",
    "x-forwarded-host": "fastrepl.anarlog.so",
  });

  assert.equal(getWorkspaceShareSlugFromHeaders(headers), "fastrepl");
});

test("does not treat the Netlify origin or reserved hosts as workspaces", () => {
  assert.equal(
    getWorkspaceShareSlugFromHeaders(new Headers({ host: "anarlog.so" })),
    null,
  );
  assert.equal(
    getWorkspaceShareSlugFromHeaders(
      new Headers({ "x-forwarded-host": "models.anarlog.so" }),
    ),
    null,
  );
});
