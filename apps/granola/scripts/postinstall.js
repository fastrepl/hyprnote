const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const GITHUB_REPO = "fastrepl/hyprnote";
const VERSION = require("../package.json").version;

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

const platformStr = platformMap[platform];
const archStr = archMap[arch];

if (!platformStr || !archStr) {
  console.error(`Unsupported platform: ${platform} ${arch}`);
  process.exit(1);
}

const binaryName = platform === "win32" ? "granola.exe" : "granola";
const targetDir = path.join(
  __dirname,
  "..",
  "binaries",
  `${platformStr}-${archStr}`,
);

fs.mkdirSync(targetDir, { recursive: true });

const targetPath = path.join(targetDir, binaryName);

if (fs.existsSync(targetPath)) {
  console.log("Binary already exists, skipping download");
  process.exit(0);
}

const rustTarget = getRustTarget(platformStr, archStr);
const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/granola-v${VERSION}/granola-${rustTarget}.tar.gz`;

console.log(`Downloading binary from: ${downloadUrl}`);

function getRustTarget(platform, arch) {
  const targets = {
    "macos-x86_64": "x86_64-apple-darwin",
    "macos-aarch64": "aarch64-apple-darwin",
    "linux-x86_64": "x86_64-unknown-linux-gnu",
    "linux-aarch64": "aarch64-unknown-linux-gnu",
    "windows-x86_64": "x86_64-pc-windows-msvc",
  };
  return targets[`${platform}-${arch}`];
}

function downloadFile(url, callback) {
  https
    .get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFile(response.headers.location, callback);
      } else if (response.statusCode === 200) {
        callback(null, response);
      } else if (response.statusCode === 404) {
        callback(new Error("NOT_FOUND"));
      } else {
        callback(
          new Error(`Download failed with status: ${response.statusCode}`),
        );
      }
    })
    .on("error", callback);
}

downloadFile(downloadUrl, (err, response) => {
  if (err) {
    if (err.message === "NOT_FOUND") {
      console.log(
        "Binary not yet published. For development, build manually: cargo build --release -p granola-cli",
      );
      console.log(
        "Once published to npm, binaries will be downloaded automatically.",
      );
      process.exit(0);
    }
    console.error("Download failed:", err.message);
    console.error(
      "You may need to build the binary manually: cargo build --release -p granola-cli",
    );
    process.exit(0);
  }

  const tarPath = path.join(targetDir, "granola.tar.gz");
  const fileStream = fs.createWriteStream(tarPath);

  response.pipe(fileStream);

  fileStream.on("finish", () => {
    fileStream.close();

    try {
      execSync(`tar -xzf granola.tar.gz`, { cwd: targetDir });
      fs.unlinkSync(tarPath);

      if (platform !== "win32") {
        fs.chmodSync(targetPath, 0o755);
      }

      console.log("Binary installed successfully");
    } catch (extractErr) {
      console.error("Extraction failed:", extractErr.message);
      process.exit(1);
    }
  });

  fileStream.on("error", (writeErr) => {
    console.error("Write failed:", writeErr.message);
    process.exit(1);
  });
});
