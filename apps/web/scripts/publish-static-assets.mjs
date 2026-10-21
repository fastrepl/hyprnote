import { readdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { publishObject, sha256 } from "./r2-assets.mjs";

const ASSET_ROOT = new URL("../../desktop/public/assets/", import.meta.url);
const MANIFEST = new URL(
  "../../desktop/src/shared/static-assets.manifest.json",
  import.meta.url,
);
const MIME_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
};

export async function collectStaticAssets(root = ASSET_ROOT, prefix = "") {
  const entries = await readdir(root, { withFileTypes: true });
  const assets = [];
  for (const entry of entries.sort((a, b) =>
    a.name.localeCompare(b.name, "en"),
  )) {
    const path = `${prefix}${entry.name}`;
    const file = new URL(encodeURIComponent(entry.name), root);
    if (entry.isDirectory()) {
      assets.push(
        ...(await collectStaticAssets(new URL(`${file.href}/`), `${path}/`)),
      );
    } else if (entry.isFile()) {
      const contentType = MIME_TYPES[entry.name.split(".").at(-1)];
      if (!contentType) throw new Error(`Unsupported asset type: ${path}`);
      const bytes = await readFile(file);
      const digest = sha256(bytes);
      assets.push({
        local: `/assets/${path}`,
        object: `desktop/${digest}/${path}`,
        bytes,
        contentType,
      });
    } else {
      throw new Error(`Asset must be a regular file: ${path}`);
    }
  }
  return assets;
}

function manifestFor(assets) {
  return `${JSON.stringify(Object.fromEntries(assets.map(({ local, object }) => [local, object])), null, 2)}\n`;
}

export async function publishStaticAssets(assets, options) {
  for (const asset of assets) {
    await publishObject(
      {
        path: asset.object,
        bytes: asset.bytes,
        contentType: asset.contentType,
        cacheControl: "public, max-age=31536000, immutable",
      },
      options,
    );
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      upload: { type: "boolean" },
      manifest: { type: "boolean" },
      check: { type: "boolean" },
    },
  });
  const assets = await collectStaticAssets();
  const manifest = manifestFor(assets);
  if (values.check && (await readFile(MANIFEST, "utf8")) !== manifest) {
    throw new Error(
      "Static asset manifest is stale; run pnpm -F @anlg/web assets:manifest",
    );
  }
  if (values.upload) {
    await publishStaticAssets(assets);
  }
  if (values.manifest) await writeFile(MANIFEST, manifest);
  console.log(
    `${values.upload ? "Published and verified" : "Prepared"} ${assets.length} assets (${(assets.reduce((sum, asset) => sum + asset.bytes.length, 0) / 1024 / 1024).toFixed(1)} MiB) for https://static.anarlog.so/desktop/`,
  );
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
