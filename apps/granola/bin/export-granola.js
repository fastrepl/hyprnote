#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const platform = process.platform;
const arch = process.arch;

const platformMap = {
  darwin: "macos",
  linux: "linux",
  win32: "windows",
};

const archMap = {
  x64: "x86_64",
  arm64: "aarch64",
};

const binaryName = platform === "win32" ? "granola.exe" : "granola";
const platformStr = platformMap[platform];
const archStr = archMap[arch];

if (!platformStr || !archStr) {
  console.error(`Unsupported platform: ${platform} ${arch}`);
  process.exit(1);
}

const binaryPath = path.join(
  __dirname,
  "..",
  "binaries",
  `${platformStr}-${archStr}`,
  binaryName,
);

if (!fs.existsSync(binaryPath)) {
  console.error(`Binary not found at: ${binaryPath}`);
  console.error(
    "For development, build manually: cargo build --release -p granola-cli",
  );
  console.error(
    "Then copy the binary to: " +
      path.join(__dirname, "..", "binaries", `${platformStr}-${archStr}`, "/"),
  );
  process.exit(1);
}

const child = spawn(binaryPath, process.argv.slice(2), {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
