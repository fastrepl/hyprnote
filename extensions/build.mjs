import * as esbuild from "esbuild";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const args = process.argv.slice(2);
const command = args[0];

function getExtensionsDir() {
  const platform = os.platform();
  const appId = "com.hyprnote.dev";

  if (platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      appId,
      "extensions",
    );
  } else if (platform === "linux") {
    return path.join(os.homedir(), ".local", "share", appId, "extensions");
  } else if (platform === "win32") {
    return path.join(os.homedir(), "AppData", "Roaming", appId, "extensions");
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

function log(message, type = "info") {
  const prefix = {
    info: "\x1b[36m[INFO]\x1b[0m",
    success: "\x1b[32m[SUCCESS]\x1b[0m",
    warn: "\x1b[33m[WARN]\x1b[0m",
    error: "\x1b[31m[ERROR]\x1b[0m",
  };
  console.log(`${prefix[type] || prefix.info} ${message}`);
}

function printUsage() {
  console.log(`
Usage: node build.mjs <command> [extension-name]

Commands:
  build [name]     Build extension(s). If name is omitted, builds all extensions.
  clean [name]     Remove dist folder(s). If name is omitted, cleans all extensions.
  install [name]   Copy extension(s) to app data directory for development.
                   If name is omitted, installs all extensions.

Examples:
  node build.mjs build                 # Build all extensions
  node build.mjs build hello-world     # Build only hello-world extension
  node build.mjs clean                 # Clean all extensions
  node build.mjs install hello-world   # Install hello-world for development
`);
}

async function buildExtension(name) {
  const extensionDir = path.join(process.cwd(), name);
  const manifestPath = path.join(extensionDir, "extension.json");

  if (!fs.existsSync(manifestPath)) {
    log(`Extension manifest not found: ${manifestPath}`, "error");
    return false;
  }

  let manifest;
  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(raw);
  } catch (err) {
    log(
      `Failed to read/parse manifest ${manifestPath}: ${err.message}`,
      "error",
    );
    return false;
  }

  log(`Building extension: ${name}`);

  for (const panel of manifest.panels || []) {
    const entryFile = panel.entry.replace("dist/", "").replace(".js", ".tsx");
    const entryPath = path.join(extensionDir, entryFile);

    if (!fs.existsSync(entryPath)) {
      log(`Panel entry not found: ${entryPath}, skipping...`, "warn");
      continue;
    }

    const outfile = path.join(extensionDir, panel.entry);
    const outdir = path.dirname(outfile);

    if (!fs.existsSync(outdir)) {
      fs.mkdirSync(outdir, { recursive: true });
    }

    log(`  Panel ${panel.id}: ${entryFile} -> ${panel.entry}`);

    try {
      const result = await esbuild.build({
        entryPoints: [entryPath],
        bundle: true,
        outfile,
        format: "iife",
        globalName: "__hypr_panel_exports",
        platform: "browser",
        target: "es2020",
        jsx: "automatic",
        plugins: [
          {
            name: "hypr-externals",
            setup(build) {
              build.onResolve({ filter: /^react$/ }, () => ({
                path: "react",
                namespace: "hypr-global",
              }));
              build.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({
                path: "react/jsx-runtime",
                namespace: "hypr-global",
              }));
              build.onResolve({ filter: /^react-dom$/ }, () => ({
                path: "react-dom",
                namespace: "hypr-global",
              }));
              build.onResolve({ filter: /^@hypr\/ui/ }, (args) => ({
                path: args.path,
                namespace: "hypr-global",
              }));
              build.onResolve({ filter: /^@hypr\/utils/ }, (args) => ({
                path: args.path,
                namespace: "hypr-global",
              }));
              build.onLoad(
                { filter: /.*/, namespace: "hypr-global" },
                (args) => {
                  if (args.path === "react") {
                    return {
                      contents: "module.exports = window.__hypr_react",
                      loader: "js",
                    };
                  }
                  if (args.path === "react/jsx-runtime") {
                    return {
                      contents: "module.exports = window.__hypr_jsx_runtime",
                      loader: "js",
                    };
                  }
                  if (args.path === "react-dom") {
                    return {
                      contents: "module.exports = window.__hypr_react_dom",
                      loader: "js",
                    };
                  }
                  if (args.path.startsWith("@hypr/ui")) {
                    const subpath = args.path
                      .replace("@hypr/ui", "")
                      .replace(/^\//, "");
                    if (subpath) {
                      return {
                        contents: `module.exports = window.__hypr_ui["${subpath}"]`,
                        loader: "js",
                      };
                    }
                    return {
                      contents: "module.exports = window.__hypr_ui",
                      loader: "js",
                    };
                  }
                  if (args.path.startsWith("@hypr/utils")) {
                    return {
                      contents: "module.exports = window.__hypr_utils",
                      loader: "js",
                    };
                  }
                  return { contents: "module.exports = {}", loader: "js" };
                },
              );
            },
          },
        ],
        minify: false,
        sourcemap: true,
      });

      if (result.errors && result.errors.length > 0) {
        log(`Failed to build panel ${panel.id}:`, "error");
        for (const error of result.errors) {
          console.error(error);
        }
        return false;
      }
    } catch (err) {
      log(`Error building panel ${panel.id}: ${err.message}`, "error");
      return false;
    }
  }

  log(`Built extension: ${name}`, "success");
  return true;
}

function getExtensionDirs() {
  const entries = fs.readdirSync(process.cwd(), { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules" &&
        fs.existsSync(path.join(process.cwd(), entry.name, "extension.json")),
    )
    .map((entry) => entry.name);
}

async function buildAll() {
  const extensions = getExtensionDirs();
  log(`Found ${extensions.length} extension(s): ${extensions.join(", ")}`);

  let success = true;
  for (const name of extensions) {
    const result = await buildExtension(name);
    if (!result) success = false;
  }
  return success;
}

function cleanExtension(name) {
  const distPath = path.join(process.cwd(), name, "dist");
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true });
    log(`Cleaned: ${name}/dist`, "success");
  } else {
    log(`Nothing to clean: ${name}/dist`, "info");
  }
}

function cleanAll() {
  const extensions = getExtensionDirs();
  for (const name of extensions) {
    cleanExtension(name);
  }
}

function installExtension(name) {
  const extensionDir = path.join(process.cwd(), name);
  const manifestPath = path.join(extensionDir, "extension.json");

  if (!fs.existsSync(manifestPath)) {
    log(`Extension not found: ${name}`, "error");
    return false;
  }

  const targetDir = path.join(getExtensionsDir(), name);

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  const copyRecursive = (src, dest) => {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };

  copyRecursive(extensionDir, targetDir);
  log(`Installed: ${name} -> ${targetDir}`, "success");
  return true;
}

function installAll() {
  const extensions = getExtensionDirs();
  log(`Installing ${extensions.length} extension(s) to ${getExtensionsDir()}`);

  for (const name of extensions) {
    installExtension(name);
  }
}

async function main() {
  const extensionName = args[1];

  switch (command) {
    case "build":
      if (extensionName) {
        const success = await buildExtension(extensionName);
        if (!success) process.exit(1);
      } else {
        const success = await buildAll();
        if (!success) process.exit(1);
      }
      break;

    case "clean":
      if (extensionName) {
        cleanExtension(extensionName);
      } else {
        cleanAll();
      }
      break;

    case "install":
      if (extensionName) {
        installExtension(extensionName);
      } else {
        installAll();
      }
      break;

    case "help":
    case "--help":
    case "-h":
      printUsage();
      break;

    default:
      if (command && !command.startsWith("-")) {
        log(`Building extension: ${command} (legacy usage)`, "info");
        const success = await buildExtension(command);
        if (!success) process.exit(1);
      } else if (!command) {
        const success = await buildAll();
        if (!success) process.exit(1);
      } else {
        printUsage();
        process.exit(1);
      }
  }
}

main().catch((err) => {
  log(`Unexpected error: ${err.message}`, "error");
  process.exit(1);
});
