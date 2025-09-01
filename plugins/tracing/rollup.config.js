import typescript from "@rollup/plugin-typescript";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cwd } from "node:process";

const pkg = JSON.parse(readFileSync(join(cwd(), "package.json"), "utf8"));

export default {
  input: "guest-js/index.ts",
  output: [
    {
      file: pkg.exports.import,
      format: "esm",
    },
    {
      file: pkg.exports.require,
      format: "cjs",
    },
  ],
  plugins: [
    typescript({
      declaration: true,
      declarationDir: dirname(pkg.exports.import),
    }),
  ],
  external: [
    /^@tauri-apps\/api/,
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
};
