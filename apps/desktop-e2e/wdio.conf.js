import { spawn } from "node:child_process";
import { resolve } from "node:path";

let tauriDriver;

// Support environment variable for app path (used in CI)
// Falls back to dev binary for local testing
const defaultAppPath = resolve(
  "../desktop/src-tauri/target/release/hyprnote-dev",
);
const appPath = process.env.APP_BINARY_PATH
  ? resolve(process.env.APP_BINARY_PATH)
  : defaultAppPath;

console.log("App binary path:", appPath);

export const config = {
  specs: ["./test/**/*.spec.js"],
  maxInstances: 1,
  hostname: "127.0.0.1",
  port: 4444,
  path: "/",
  capabilities: [
    {
      maxInstances: 1,
      "tauri:options": {
        application: appPath,
      },
    },
  ],
  reporters: ["spec"],
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },

  onPrepare: function () {
    return new Promise((resolve, reject) => {
      // In CI, wrap tauri-driver with xvfb-run to provide a virtual display
      // This is needed because tauri-driver initializes GTK which requires X11
      const useXvfb = !!process.env.CI;
      const cmd = useXvfb ? "xvfb-run" : "tauri-driver";
      const args = useXvfb ? ["-a", "tauri-driver"] : [];

      console.log(`Starting tauri-driver${useXvfb ? " with xvfb-run" : ""}...`);

      tauriDriver = spawn(cmd, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      tauriDriver.on("error", (err) => {
        reject(new Error(`Failed to start tauri-driver: ${err.message}`));
      });

      const timeout = setTimeout(() => {
        reject(new Error("tauri-driver did not start in time"));
      }, 10000);

      tauriDriver.stdout.on("data", (data) => {
        const message = data.toString();
        console.log("tauri-driver:", message);
        if (message.includes("Listening")) {
          clearTimeout(timeout);
          resolve();
        }
      });

      tauriDriver.stderr.on("data", (data) => {
        console.error("tauri-driver error:", data.toString());
      });
    });
  },

  onComplete: function () {
    if (tauriDriver) {
      tauriDriver.kill();
    }
  },
};
