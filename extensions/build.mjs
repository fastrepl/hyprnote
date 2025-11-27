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

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

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

    await esbuild.build({
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
  }

  console.log(`Built extension: ${name}`);
}

async function buildAll() {
  const entries = fs.readdirSync(process.cwd(), { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      const manifestPath = path.join(process.cwd(), entry.name, "extension.json");
      if (fs.existsSync(manifestPath)) {
        await buildExtension(entry.name);
      }
    }
  }
}

if (extensionName) {
  buildExtension(extensionName);
} else {
  buildAll();
}
