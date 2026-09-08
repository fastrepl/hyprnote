import assert from "node:assert/strict";
import test from "node:test";

import { getWorkspaceShareSlugFromHeaders } from "../lib/request-workspace-share-host.ts";
import worker, {
  createWorkspaceShareOriginRequest,
} from "./workspace-share-router.ts";

test("routes a workspace hostname to the canonical web origin with its original host", async () => {
  const request = new Request(
    "https://fastrepl.anarlog.so/share/public/note/?view=compact",
    {
      headers: {
        cookie: "session=secret",
        "x-forwarded-host": "spoofed.example.com",
        "x-anarlog-workspace-share-host": "another-workspace.anarlog.so",
        "x-anarlog-workspace-share-token": "spoofed-token",
      },
    },
  );

  const originRequest = createWorkspaceShareOriginRequest(
    request,
    "test-secret",
  );

  assert.notEqual(originRequest, null);
  assert.equal(
    originRequest?.url,
    "https://anarlog.so/share/public/note/?view=compact",
  );
  assert.equal(
    originRequest?.headers.get("x-forwarded-host"),
    "fastrepl.anarlog.so",
  );
  assert.equal(originRequest?.headers.get("cookie"), "session=secret");
  assert.equal(originRequest?.redirect, "manual");

  const originHeaders = new Headers(originRequest?.headers);
  originHeaders.set("host", "anarlog.so");
  originHeaders.set("x-forwarded-host", "anarlog.so");
  assert.equal(
    getWorkspaceShareSlugFromHeaders(originHeaders, "test-secret"),
    "fastrepl",
  );
});

test("does not route reserved or malformed workspace hostnames", () => {
  assert.equal(
    createWorkspaceShareOriginRequest(
      new Request("https://models.anarlog.so/model.bin"),
      "test-secret",
    ),
    null,
  );
  assert.equal(
    createWorkspaceShareOriginRequest(
      new Request("https://nested.fastrepl.anarlog.so/share/note"),
      "test-secret",
    ),
    null,
  );
});

test("keeps double-slash paths on the configured origin", () => {
  const request = createWorkspaceShareOriginRequest(
    new Request(
      "https://fastrepl.anarlog.so//example.com/private?view=compact",
    ),
    "test-secret",
  );
  assert.equal(
    request?.url,
    "https://anarlog.so//example.com/private?view=compact",
  );
});

test("rejects workspace requests when the proxy secret is missing", async () => {
  const response = await worker.fetch(
    new Request("https://fastrepl.anarlog.so/app/"),
    {},
  );
  assert.equal(response.status, 503);
});

test("removes workspace proxy headers when passing through platform hosts", async (t) => {
  const fetchMock = t.mock.method(
    globalThis,
    "fetch",
    async (request: Request) => {
      assert.equal(request.headers.get("x-anarlog-workspace-share-host"), null);
      assert.equal(
        request.headers.get("x-anarlog-workspace-share-token"),
        null,
      );
      return new Response("ok");
    },
  );

  const response = await worker.fetch(
    new Request("https://api.anarlog.so/health", {
      headers: {
        "x-anarlog-workspace-share-host": "fastrepl.anarlog.so",
        "x-anarlog-workspace-share-token": "spoofed-token",
      },
    }),
    { WORKSPACE_SHARE_PROXY_SECRET: "test-secret" },
  );

  assert.equal(response.status, 200);
  assert.equal(fetchMock.mock.callCount(), 1);
});

for (const [location, expected] of [
  [
    "https://anarlog.so/app/?view=compact#notes",
    "https://fastrepl.anarlog.so/app/?view=compact#notes",
  ],
  ["/auth/?flow=web", "https://fastrepl.anarlog.so/auth/?flow=web"],
  ["https://accounts.google.com/auth", "https://accounts.google.com/auth"],
]) {
  test(`preserves the browser destination for redirect ${location}`, async (t) => {
    const fetchMock = t.mock.method(
      globalThis,
      "fetch",
      async () => new Response(null, { status: 308, headers: { location } }),
    );

    const response = await worker.fetch(
      new Request("https://fastrepl.anarlog.so/app"),
      { WORKSPACE_SHARE_PROXY_SECRET: "test-secret" },
    );

    assert.equal(response.status, 308);
    assert.equal(response.headers.get("location"), expected);
    assert.equal(fetchMock.mock.callCount(), 1);
  });
}
