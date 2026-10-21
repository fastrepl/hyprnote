import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

// Anarlog's public images live under anarlog/ in the shared fastrepl R2 bucket and
// are served at https://static.anarlog.so/<path> (alias of static.fastrepl.com/anarlog/<path>).
export const BUCKET = "fastrepl-static-assets";
export const PREFIX = "anarlog";
const webDir = fileURLToPath(new URL("..", import.meta.url));

export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

const encode = (path) => path.split("/").map(encodeURIComponent).join("/");
export const publicUrl = (path) => `https://static.anarlog.so/${encode(path)}`;
const originUrl = (path) =>
  `https://static.fastrepl.com/${PREFIX}/${encode(path)}`;

// False when nothing is published at the path; throws when different bytes are.
export async function isPublished(path, { sha, contentType }, fetchImpl) {
  const response = await fetchImpl(originUrl(path));
  if (response.status === 404) return false;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (
    response.status !== 200 ||
    response.headers.get("content-type") !== contentType ||
    sha256(bytes) !== sha
  )
    throw new Error(
      `${originUrl(path)} already serves different content (HTTP ${response.status}); published assets are never replaced`,
    );
  return true;
}

// Uploads use the person's own `wrangler login`; no storage key is read or stored.
async function wranglerPut(path, bytes, { contentType, cacheControl }) {
  const folder = await mkdtemp(join(tmpdir(), "anlg-r2-"));
  try {
    const file = join(folder, "object");
    await writeFile(file, bytes);
    await promisify(execFile)(
      "pnpm",
      [
        "exec",
        "wrangler",
        "r2",
        "object",
        "put",
        `${BUCKET}/${PREFIX}/${path}`,
        "--file",
        file,
        "--content-type",
        contentType,
        "--cache-control",
        cacheControl,
        "--config",
        "wrangler.static-assets.jsonc",
        "--remote",
      ],
      { cwd: webDir },
    );
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

export async function existsAt(path, fetchImpl = fetch) {
  const response = await fetchImpl(originUrl(path), { method: "HEAD" });
  if (response.status === 404) return false;
  if (!response.ok)
    throw new Error(`HEAD ${originUrl(path)} failed (HTTP ${response.status})`);
  return true;
}

// Uploads bytes once and verifies them through the public origin. Re-running with the
// same bytes is a no-op; different bytes at a published path are refused.
export async function publishObject(
  { path, bytes, contentType, cacheControl },
  { fetchImpl = fetch, put = wranglerPut } = {},
) {
  const expected = { sha: sha256(bytes), contentType };
  if (await isPublished(path, expected, fetchImpl)) return "existing";
  await put(path, bytes, { contentType, cacheControl });
  if (!(await isPublished(path, expected, fetchImpl)))
    throw new Error(`Uploaded but not served: ${originUrl(path)}`);
  return "uploaded";
}
