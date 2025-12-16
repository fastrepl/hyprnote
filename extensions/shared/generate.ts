import { dirname, fromFileUrl, join } from "@std/path";
import nunjucks from "nunjucks";

import { CORE_MODULES, getUiComponentAlias, HYPR_MODULES } from "./runtime.ts";

interface UiModuleDefinition {
  subpath: string;
  alias: string;
  exports: string[];
}

const SCRIPT_DIR = dirname(fromFileUrl(import.meta.url));
const ROOT_DIR = dirname(dirname(SCRIPT_DIR));
const UI_SRC_DIR = join(ROOT_DIR, "packages", "ui", "src");
const UI_COMPONENTS_DIR = join(UI_SRC_DIR, "components");
const TEMPLATES_DIR = join(SCRIPT_DIR, "templates");

function toPosixPath(path: string): string {
  return path.replace(/\\/g, "/");
}

function extractExports(filePath: string): string[] {
  const content = Deno.readTextFileSync(filePath);
  const exports: string[] = [];

  const namedExportMatch = content.match(
    /export\s*\{\s*([^}]+)\s*\}\s*;?\s*$/m,
  );
  if (namedExportMatch) {
    const names = namedExportMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("type "));
    exports.push(...names);
  }

  const inlineExports = content.matchAll(
    /export\s+(?:const|function|class)\s+(\w+)/g,
  );
  for (const match of inlineExports) {
    if (!exports.includes(match[1])) {
      exports.push(match[1]);
    }
  }

  return exports;
}

function collectUiModules(): UiModuleDefinition[] {
  const modules: UiModuleDefinition[] = [];

  function walk(dir: string) {
    for (const entry of Deno.readDirSync(dir)) {
      const entryPath = join(dir, entry.name);
      if (entry.isDirectory) {
        walk(entryPath);
        continue;
      }

      if (
        entry.isFile &&
        (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
      ) {
        const relativeFromUiSrc = toPosixPath(
          entryPath
            .replace(UI_SRC_DIR + "/", "")
            .replace(UI_SRC_DIR + "\\", ""),
        );
        const subpath = relativeFromUiSrc.replace(/\.(ts|tsx)$/i, "");
        const exports = extractExports(entryPath);
        const alias = getUiComponentAlias(subpath);
        modules.push({ subpath, alias, exports });
      }
    }
  }

  walk(UI_COMPONENTS_DIR);
  modules.sort((a, b) => a.subpath.localeCompare(b.subpath));
  return modules;
}

function printGlobalsChecklist(uiModules: UiModuleDefinition[]) {
  console.log(`\nRequired window globals:\n`);
  for (const [name, config] of Object.entries(CORE_MODULES)) {
    console.log(`  window.${config.global}  // ${name}`);
  }
  console.log(`  window.${HYPR_MODULES["@hypr/store"].global}  // @hypr/store`);
  console.log(`  window.${HYPR_MODULES["@hypr/tabs"].global}  // @hypr/tabs`);
  console.log(`  window.${HYPR_MODULES["@hypr/ui"].global}  // @hypr/ui/*`);
  console.log(
    `\nRequired UI subpaths in window.${HYPR_MODULES["@hypr/ui"].global}:\n`,
  );
  for (const module of uiModules) {
    console.log(`  "${module.subpath}"`);
  }
}

async function main() {
  const uiModules = collectUiModules();

  const env = nunjucks.configure(TEMPLATES_DIR, {
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true,
  });

  const output = env.render("hypr-extension.d.ts.njk", {
    store: HYPR_MODULES["@hypr/store"],
    tabs: HYPR_MODULES["@hypr/tabs"],
    uiModules,
  });

  await Deno.writeTextFile("types/hypr-extension.d.ts", output);
  console.log("✓ Generated types/hypr-extension.d.ts");

  printGlobalsChecklist(uiModules);
}

main();
