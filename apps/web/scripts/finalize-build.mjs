import { traceNodeModules } from "nf3";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const vercel =
  process.env.NITRO_PRESET === "vercel" || process.env.VERCEL === "1";
const publicDir = vercel ? ".vercel/output/static" : ".output/public";
const serverDir = vercel
  ? ".vercel/output/functions/__server.func"
  : ".output/server";
if (!existsSync(publicDir) || !existsSync(serverDir))
  throw new Error("Missing Nitro build output");

// Sharp resolves its native binding dynamically; trace the external package
// after both bundlers have finished so it remains intact in the function.
await traceNodeModules([createRequire(import.meta.url).resolve("sharp")], {
  rootDir: process.cwd(),
  outDir: serverDir,
  fullTraceInclude: ["sharp"],
  writePackageJson: true,
});

await cp("public/sitemap.xml", `${publicDir}/sitemap.xml`);
await mkdir(`${serverDir}/public`, { recursive: true });
await cp("public/fonts", `${serverDir}/public/fonts`, { recursive: true });
const result = spawnSync("pnpm", ["exec", "pagefind", "--site", publicDir], {
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
