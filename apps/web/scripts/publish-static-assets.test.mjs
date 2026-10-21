import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  collectStaticAssets,
  publishStaticAssets,
} from "./publish-static-assets.mjs";
import { existsAt, publishObject, s3Put } from "./r2-assets.mjs";

test("concurrent publishers cannot replace the first object at a permanent URL", async (t) => {
  let stored;
  const openBodies = new Set();
  const response = (status) => {
    const body = new ReadableStream({
      cancel() {
        openBodies.delete(body);
      },
    });
    openBodies.add(body);
    return new Response(body, { status });
  };
  const credentials = {
    accountId: "a".repeat(32),
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
  };
  t.mock.method(globalThis, "fetch", async (request) => {
    assert.equal(request.headers.get("if-none-match"), "*");
    const bytes = Buffer.from(await request.arrayBuffer());
    if (stored) return response(412);
    stored = bytes;
    return response(200);
  });
  const options = {
    fetchImpl: async () =>
      stored
        ? new Response(stored, { headers: { "content-type": "image/svg+xml" } })
        : new Response(null, { status: 404 }),
    put: (path, bytes, metadata) => s3Put(path, bytes, metadata, credentials),
  };
  const asset = {
    path: "blog/articles/demo/diagram.svg",
    contentType: "image/svg+xml",
    cacheControl: "public, max-age=31536000",
  };
  const results = await Promise.allSettled([
    publishObject({ ...asset, bytes: Buffer.from("first") }, options),
    publishObject({ ...asset, bytes: Buffer.from("second") }, options),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.match(
    results.find((result) => result.status === "rejected").reason.message,
    /different content/,
  );
  assert.equal(openBodies.size, 0);
  const winner = Buffer.from(stored);
  assert.equal(
    await publishObject({ ...asset, bytes: winner }, options),
    "existing",
  );
  assert.deepEqual(stored, winner);
});

test("publishes immutable media to R2 once and refuses different bytes at a published path", async (t) => {
  const folder = await mkdtemp(join(tmpdir(), "anlg-static-assets-"));
  t.after(() => rm(folder, { recursive: true, force: true }));
  await writeFile(join(folder, "icon space.svg"), "original");
  const assets = await collectStaticAssets(pathToFileURL(`${folder}/`));
  await writeFile(join(folder, "icon space.svg"), "changed");
  const changed = await collectStaticAssets(pathToFileURL(`${folder}/`));
  assert.notEqual(assets[0].object, changed[0].object);

  let served = null;
  const puts = [];
  const fetchImpl = async (url) => {
    assert.equal(
      url,
      `https://static.anarlog.so/${assets[0].object.replace(" ", "%20")}`,
    );
    return served === null
      ? new Response(null, { status: 404 })
      : new Response(served, { headers: { "content-type": "image/svg+xml" } });
  };
  const put = async (path, bytes, options) => {
    puts.push({ path, options });
    served = bytes;
  };
  await publishStaticAssets(assets, { fetchImpl, put });
  assert.deepEqual(puts, [
    {
      path: assets[0].object,
      options: {
        contentType: "image/svg+xml",
        cacheControl: "public, max-age=31536000, immutable",
      },
    },
  ]);

  await publishStaticAssets(assets, {
    fetchImpl,
    put: async () => {
      throw new Error("publishing is unavailable");
    },
  });
  assert.deepEqual(served, assets[0].bytes);

  served = Buffer.from("corrupted");
  await assert.rejects(
    publishStaticAssets(assets, { fetchImpl, put }),
    /already serves different content/,
  );
  assert.deepEqual(served, Buffer.from("corrupted"));
});

test("public asset checks recover from transient failures and bound persistent failures", async (t) => {
  let transient = true;
  assert.equal(
    await existsAt("image.svg", async (url, { signal }) => {
      assert.equal(url, "https://static.anarlog.so/image.svg");
      assert.ok(signal instanceof AbortSignal);
      if (transient) {
        transient = false;
        throw new DOMException("stalled", "TimeoutError");
      }
      return new Response(null, { status: 200 });
    }),
    true,
  );
  t.mock.method(AbortSignal, "timeout", () =>
    AbortSignal.abort(new DOMException("stalled", "TimeoutError")),
  );
  await assert.rejects(
    existsAt("image.svg", async (_, { signal }) => {
      signal.throwIfAborted();
      throw new Error("request did not time out");
    }),
    { name: "TimeoutError" },
  );
});

test("publishing releases a missing asset response before uploading", async () => {
  let released = false;
  let stored;
  const bytes = Buffer.from("image");
  await publishObject(
    { path: "image.svg", bytes, contentType: "image/svg+xml" },
    {
      fetchImpl: async () =>
        stored
          ? new Response(stored, {
              headers: { "content-type": "image/svg+xml" },
            })
          : new Response(
              new ReadableStream({
                cancel() {
                  released = true;
                },
              }),
              { status: 404 },
            ),
      put: async (_, data) => {
        assert.equal(released, true);
        stored = data;
      },
    },
  );
  assert.deepEqual(stored, bytes);
});

test("publication verification recovers from transient errors after a successful upload", async () => {
  const bytes = Buffer.from("image");
  let stored;
  const failures = [new DOMException("stalled", "TimeoutError"), 503];
  const result = await publishObject(
    { path: "retry.svg", bytes, contentType: "image/svg+xml" },
    {
      fetchImpl: async () => {
        if (!stored) return new Response(null, { status: 404 });
        const failure = failures.shift();
        if (failure instanceof Error) throw failure;
        if (failure) return new Response(null, { status: failure });
        return new Response(stored, {
          headers: { "content-type": "image/svg+xml" },
        });
      },
      put: async (_, data) => {
        stored = data;
      },
    },
  );
  assert.equal(result, "uploaded");
  assert.deepEqual(stored, bytes);
});
