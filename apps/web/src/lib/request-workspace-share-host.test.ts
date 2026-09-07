import assert from "node:assert/strict";
import test from "node:test";

import {
  getRequestHost,
  getWorkspaceShareSlugFromHeaders,
} from "./request-workspace-share-host.ts";

test("preserves the workspace host when Netlify replaces forwarded headers", () => {
  const headers = new Headers({
    host: "anarlog.netlify.app",
    "x-forwarded-host": "anarlog.netlify.app",
    "x-anarlog-workspace-share-host": "fastrepl.anarlog.so",
  });

  assert.equal(getRequestHost(headers), "fastrepl.anarlog.so");
  assert.equal(getWorkspaceShareSlugFromHeaders(headers), "fastrepl");
});

test("reads the workspace slug from the Cloudflare forwarded host", () => {
  const headers = new Headers({
    host: "anarlog.netlify.app",
    "x-forwarded-host": "fastrepl.anarlog.so",
  });

  assert.equal(getWorkspaceShareSlugFromHeaders(headers), "fastrepl");
});

test("does not treat the Netlify origin or reserved hosts as workspaces", () => {
  assert.equal(
    getWorkspaceShareSlugFromHeaders(
      new Headers({ host: "anarlog.netlify.app" }),
    ),
    null,
  );
  assert.equal(
    getWorkspaceShareSlugFromHeaders(
      new Headers({ "x-forwarded-host": "models.anarlog.so" }),
    ),
    null,
  );
});
