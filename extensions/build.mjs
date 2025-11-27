import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";

const extensionName = process.argv[2];

async function buildExtension(name) {
  const extensionDir = path.join(process.cwd(), name);
  const manifestPath = path.join(extensionDir, "extension.json");

  if (!fs.existsSync(manifestPath)) {
    console.error(`Extension manifest not found: ${manifestPath}`);
    return;
  }

  let manifest;
  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read/parse manifest ${manifestPath}:`, err);
    return;
  }

  for (const panel of manifest.panels || []) {
    const entryFile = panel.entry.replace("dist/", "").replace(".js", ".tsx");
    const entryPath = path.join(extensionDir, entryFile);

    if (!fs.existsSync(entryPath)) {
      console.warn(`Panel entry not found: ${entryPath}, skipping...`);
      continue;
    }

    const outfile = path.join(extensionDir, panel.entry);
    const outdir = path.dirname(outfile);

    if (!fs.existsSync(outdir)) {
      fs.mkdirSync(outdir, { recursive: true });
    }

    console.log(`Building ${name}/${panel.id}: ${entryFile} -> ${panel.entry}`);

    try {
      const result = await esbuild.build({
        entryPoints: [entryPath],
        bundle: true,
        outfile,
        format: "esm",
        platform: "browser",
        target: "es2020",
        jsx: "automatic",
        external: ["react", "react-dom", "@hypr/ui", "@hypr/utils"],
        minify: false,
        sourcemap: true,
      });

      if (result.errors && result.errors.length > 0) {
        console.error(
          `Failed to build panel ${panel.id} (${entryPath} -> ${outfile}):`,
        );
        for (const error of result.errors) {
          console.error(error);
        }
        process.exit(1);
      }
    } catch (err) {
      console.error(
        `Error building panel ${panel.id} (${entryPath} -> ${outfile}):`,
        err,
      );
      process.exit(1);
    }
  }

  console.log(`Built extension: ${name}`);
}

async function buildAll() {
  const entries = fs.readdirSync(process.cwd(), { withFileTypes: true });

  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      entry.name !== "node_modules"
    ) {
      const manifestPath = path.join(
        process.cwd(),
        entry.name,
        "extension.json",
      );
      if (fs.existsSync(manifestPath)) {
        await buildExtension(entry.name);
      }
    }
  }
}

if (extensionName) {
  await buildExtension(extensionName);
} else {
  await buildAll();
}
