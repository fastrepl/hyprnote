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
import { publishObject, s3Put } from "./r2-assets.mjs";

test("concurrent publishers cannot replace the first object at a permanent URL", async (t) => {
  let stored;
  const credentials = {
    accountId: "a".repeat(32),
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
  };
  t.mock.method(globalThis, "fetch", async (request) => {
    assert.equal(request.headers.get("if-none-match"), "*");
    const bytes = Buffer.from(await request.arrayBuffer());
    if (stored) return new Response(null, { status: 412 });
    stored = bytes;
    return new Response(null, { status: 200 });
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
      `https://static.fastrepl.com/anarlog/${assets[0].object.replace(" ", "%20")}`,
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

  await publishStaticAssets(assets, { fetchImpl, put });
  assert.deepEqual(served, assets[0].bytes);

  served = Buffer.from("corrupted");
  await assert.rejects(
    publishStaticAssets(assets, { fetchImpl, put }),
    /already serves different content/,
  );
  assert.deepEqual(served, Buffer.from("corrupted"));
});
