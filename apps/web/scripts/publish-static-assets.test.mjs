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
  assert.equal(puts.length, 1);

  served = Buffer.from("corrupted");
  await assert.rejects(
    publishStaticAssets(assets, { fetchImpl, put }),
    /already serves different content/,
  );
  assert.equal(puts.length, 1);
});
