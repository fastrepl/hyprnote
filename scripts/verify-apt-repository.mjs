import { readFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const FILES = [
  "anarlog-archive-keyring.asc",
  "dists/stable/Release",
  "dists/stable/InRelease",
  "dists/stable/Release.gpg",
  ...["amd64", "arm64"].flatMap((architecture) => [
    `dists/stable/main/binary-${architecture}/Packages`,
    `dists/stable/main/binary-${architecture}/Packages.gz`,
  ]),
];

export async function readExpectedRepository(directory, version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error("--version must be a stable version such as 1.4.22");
  }
  const files = new Map(
    await Promise.all(
      FILES.map(async (file) => [
        file,
        await readFile(path.join(directory, file)),
      ]),
    ),
  );
  const release = files.get("dists/stable/Release").toString("utf8");
  if (!release.split("\n").includes(`Version: ${version}`)) {
    throw new Error(`Expected APT metadata for ${version} in ${directory}`);
  }
  return files;
}

export async function verifyRepository(files, fetchFile = fetch) {
  for (const [file, expected] of files) {
    const url = `https://anarlog.so/apt/${file}`;
    const response = await fetchFile(url, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok)
      throw new Error(`GET ${url} failed with ${response.status}`);
    const actual = Buffer.from(await response.arrayBuffer());
    if (!actual.equals(expected)) {
      throw new Error(
        `Live APT file differs from the published metadata: ${file}`,
      );
    }
  }
}

async function main() {
  const { values } = parseArgs({
    options: { version: { type: "string" } },
  });
  const directory = fileURLToPath(
    new URL("../apps/web/public/apt/", import.meta.url),
  );
  const files = await readExpectedRepository(directory, values.version);
  const deadline = Date.now() + 10 * 60_000;
  while (true) {
    try {
      await verifyRepository(files);
      console.log(
        `Verified live APT repository for ${values.version} (amd64 and arm64)`,
      );
      return;
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      console.log(`${error.message}; waiting for the deployment and CDN cache`);
      await setTimeout(15_000);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
