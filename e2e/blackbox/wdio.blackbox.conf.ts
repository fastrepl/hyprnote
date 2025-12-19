import type { Frameworks } from "@wdio/types";
import { type ChildProcess, spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

import { TestRecorder } from "./record.js";

const videoRecorder = new TestRecorder();
let tauriDriver: ChildProcess;

// Support environment variable for app path (used in CI)
// Falls back to dev binary for local testing
const defaultAppPath = path.resolve(
  import.meta.dirname,
  "../../apps/desktop/src-tauri/target/release/hyprnote-dev",
);
const appPath = process.env.APP_BINARY_PATH
  ? path.resolve(process.env.APP_BINARY_PATH)
  : defaultAppPath;

console.log("App binary path:", appPath);

export const config = {
  hostname: "127.0.0.1",
  runner: "local",
  port: 4444,
  specs: ["./tests/**/*.spec.ts"],
  maxInstances: 1,
  capabilities: [
    {
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
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: "./tsconfig.json",
      transpileOnly: true,
    },
  },

  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 0,

  beforeTest: async function (test: Frameworks.Test) {
    const videoPath = path.join(import.meta.dirname, "videos");
    videoRecorder.start(test, videoPath);
  },

  afterTest: async function () {
    await sleep(2000); // Let browser settle before stopping.
    videoRecorder.stop();
  },

  // ensure we are running `tauri-driver` before the session starts so that we can proxy the webdriver requests
  beforeSession: () => {
    // In CI, wrap tauri-driver with xvfb-run to provide a virtual display
    // This is needed because tauri-driver initializes GTK which requires X11
    const useXvfb = !!process.env.CI;
    const cmd = useXvfb ? "xvfb-run" : "tauri-driver";
    const args = useXvfb ? ["-a", "tauri-driver"] : [];

    console.log(`Starting tauri-driver${useXvfb ? " with xvfb-run" : ""}...`);

    tauriDriver = spawn(
      cmd,
      args.length > 0
        ? args
        : [path.resolve(os.homedir(), ".cargo", "bin", "tauri-driver")].filter(
            () => false,
          ),
      {
        stdio: [null, process.stdout, process.stderr],
      },
    );

    // For local development, spawn tauri-driver directly
    if (!useXvfb) {
      tauriDriver = spawn(
        path.resolve(os.homedir(), ".cargo", "bin", "tauri-driver"),
        [],
        {
          stdio: [null, process.stdout, process.stderr],
        },
      );
    }
  },

  afterSession: () => {
    tauriDriver.kill();
  },
};

async function sleep(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}
