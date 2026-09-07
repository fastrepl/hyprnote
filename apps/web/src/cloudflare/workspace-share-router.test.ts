import assert from "node:assert/strict";
import test from "node:test";

import { getWorkspaceShareSlugFromHeaders } from "../lib/request-workspace-share-host.ts";
import { createWorkspaceShareOriginRequest } from "./workspace-share-router.ts";

test("routes a workspace hostname to Netlify with its original host", async () => {
  const request = new Request(
    "https://fastrepl.anarlog.so/share/public/note/?view=compact",
    {
      headers: {
        cookie: "session=secret",
        "x-forwarded-host": "spoofed.example.com",
        "x-anarlog-workspace-share-host": "another-workspace.anarlog.so",
      },
    },
  );

  const originRequest = createWorkspaceShareOriginRequest(request);

  assert.notEqual(originRequest, null);
  assert.equal(
    originRequest?.url,
    "https://anarlog.netlify.app/share/public/note/?view=compact",
  );
  assert.equal(
    originRequest?.headers.get("x-forwarded-host"),
    "fastrepl.anarlog.so",
  );
  assert.equal(originRequest?.headers.get("cookie"), "session=secret");

  const netlifyHeaders = new Headers(originRequest?.headers);
  netlifyHeaders.set("host", "anarlog.netlify.app");
  netlifyHeaders.set("x-forwarded-host", "anarlog.netlify.app");
  assert.equal(getWorkspaceShareSlugFromHeaders(netlifyHeaders), "fastrepl");
});

test("does not route reserved or malformed workspace hostnames", () => {
  assert.equal(
    createWorkspaceShareOriginRequest(
      new Request("https://models.anarlog.so/model.bin"),
    ),
    null,
  );
  assert.equal(
    createWorkspaceShareOriginRequest(
      new Request("https://nested.fastrepl.anarlog.so/share/note"),
    ),
    null,
  );
});
