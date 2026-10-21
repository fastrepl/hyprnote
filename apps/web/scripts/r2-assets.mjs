import { AwsClient } from "aws4fetch";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

// Anarlog's public images live under anarlog/ in the shared fastrepl R2 bucket and
// are served at https://static.anarlog.so/<path> (alias of static.fastrepl.com/anarlog/<path>).
export const BUCKET = "fastrepl-static-assets";
export const PREFIX = "anarlog";

export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

const encode = (path) => path.split("/").map(encodeURIComponent).join("/");
export const publicUrl = (path) => `https://static.anarlog.so/${encode(path)}`;

// False when nothing is published at the path; throws when different bytes are.
export async function isPublished(path, { sha, contentType }, fetchImpl) {
  const { response, bytes } = await fetchPublic(path, "GET", fetchImpl);
  if (response.status === 404) return false;
  if (
    response.status !== 200 ||
    response.headers.get("content-type") !== contentType ||
    sha256(bytes) !== sha
  )
    throw new Error(
      `${publicUrl(path)} already serves different content (HTTP ${response.status}); published assets are never replaced`,
    );
  return true;
}

export async function s3Put(
  path,
  bytes,
  { contentType, cacheControl },
  credentials,
) {
  const { accountId, accessKeyId, secretAccessKey } = credentials ?? {
    accountId: process.env.ANARLOG_R2_ACCOUNT_ID,
    accessKeyId: process.env.ANARLOG_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.ANARLOG_R2_SECRET_ACCESS_KEY,
  };
  if (
    !/^[a-f0-9]{32}$/.test(accountId ?? "") ||
    !accessKeyId ||
    !secretAccessKey
  ) {
    throw new Error(
      "Set valid ANARLOG_R2_ACCOUNT_ID, ANARLOG_R2_ACCESS_KEY_ID and ANARLOG_R2_SECRET_ACCESS_KEY through Infisical",
    );
  }
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const response = await client.fetch(
    `https://${accountId}.r2.cloudflarestorage.com/${BUCKET}/${PREFIX}/${encode(path)}`,
    {
      method: "PUT",
      headers: {
        "if-none-match": "*",
        "content-type": contentType,
        "cache-control": cacheControl,
      },
      body: bytes,
    },
  );
  await response.body?.cancel();
  // Another publisher may have created the key; the caller verifies its bytes.
  if (!response.ok && response.status !== 412) {
    throw new Error(`Conditional R2 upload failed (HTTP ${response.status})`);
  }
}

async function fetchPublic(path, method, fetchImpl) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetchImpl(publicUrl(path), {
        method,
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 429 || response.status >= 500) {
        await response.body?.cancel();
        throw new Error(
          `${method} ${publicUrl(path)} failed (HTTP ${response.status})`,
        );
      }
      let bytes;
      if (method === "GET" && response.ok) {
        bytes = Buffer.from(await response.arrayBuffer());
      } else {
        await response.body?.cancel();
      }
      return { response, bytes };
    } catch (error) {
      if (attempt >= 2) throw error;
      await delay(200 * 2 ** attempt);
    }
  }
}

export async function existsAt(path, fetchImpl = fetch) {
  const { response } = await fetchPublic(path, "HEAD", fetchImpl);
  if (response.status === 404) return false;
  if (!response.ok)
    throw new Error(`HEAD ${publicUrl(path)} failed (HTTP ${response.status})`);
  return true;
}

// Uploads bytes once and verifies them through the public origin. Re-running with the
// same bytes is a no-op; different bytes at a published path are refused.
export async function publishObject(
  { path, bytes, contentType, cacheControl },
  { fetchImpl = fetch, put = s3Put } = {},
) {
  const expected = { sha: sha256(bytes), contentType };
  if (await isPublished(path, expected, fetchImpl)) return "existing";
  await put(path, bytes, { contentType, cacheControl });
  if (!(await isPublished(path, expected, fetchImpl)))
    throw new Error(`Uploaded but not served: ${publicUrl(path)}`);
  return "uploaded";
}
