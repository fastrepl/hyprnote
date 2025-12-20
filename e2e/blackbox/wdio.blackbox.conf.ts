import { waitTauriDriverReady } from "@crabnebula/tauri-driver";
import { waitTestRunnerBackendReady } from "@crabnebula/test-runner-backend";
import type { Frameworks } from "@wdio/types";
import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";

import { TestRecorder } from "./record.js";

const videoRecorder = new TestRecorder();

// Keep track of child processes
let tauriDriver: ChildProcess | undefined;
let killedTauriDriver = false;
let testRunnerBackend: ChildProcess | undefined;
let killedTestRunnerBackend = false;

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

function closeTauriDriver() {
  killedTauriDriver = true;
  tauriDriver?.kill();
  killedTestRunnerBackend = true;
  testRunnerBackend?.kill();
}

function onShutdown(fn: () => void) {
  const cleanup = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };
  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);
  process.on("SIGBREAK", cleanup);
}

onShutdown(closeTauriDriver);

export const config = {
  hostname: "127.0.0.1",
  runner: "local",
  port: 4444,
  specs: ["./tests/**/*.spec.ts"],
  maxInstances: 1,
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

  // Set up test-runner-backend for macOS support
  onPrepare: async () => {
    if (process.platform === "darwin") {
      // CN_API_KEY is required to run macOS tests via CrabNebula Webdriver for Tauri
      if (!process.env.CN_API_KEY) {
        console.error(
          "CN_API_KEY is not set, required for CrabNebula Webdriver on macOS",
        );
        process.exit(1);
      }

      console.log("Starting test-runner-backend for macOS...");
      testRunnerBackend = spawn("pnpm", ["test-runner-backend"], {
        stdio: "inherit",
        shell: true,
      });

      testRunnerBackend.on("error", (error) => {
        console.error("test-runner-backend error:", error);
        process.exit(1);
      });

      testRunnerBackend.on("exit", (code) => {
        if (!killedTestRunnerBackend) {
          console.error("test-runner-backend exited with code:", code);
          process.exit(1);
        }
      });

      await waitTestRunnerBackendReady();

      // Instruct tauri-driver to connect to the test-runner-backend
      process.env.REMOTE_WEBDRIVER_URL = "http://127.0.0.1:3000";
    }
  },

  beforeTest: async function (test: Frameworks.Test) {
    const videoPath = path.join(import.meta.dirname, "videos");
    videoRecorder.start(test, videoPath);
  },

  afterTest: async function () {
    await sleep(2000); // Let browser settle before stopping.
    videoRecorder.stop();
  },

  // Ensure we are running `tauri-driver` before the session starts so that we can proxy the webdriver requests
  beforeSession: async () => {
    // In CI on Linux, wrap tauri-driver with xvfb-run to provide a virtual display
    // This is needed because tauri-driver initializes GTK which requires X11
    const useXvfb = !!process.env.CI && process.platform === "linux";

    // Set ONBOARDING=0 to skip onboarding flow for deterministic test state
    // This env var is inherited by the app when tauri-driver launches it
    const env = { ...process.env, ONBOARDING: "0" };

    if (useXvfb) {
      console.log("Starting tauri-driver with xvfb-run (ONBOARDING=0)...");
      tauriDriver = spawn("xvfb-run", ["-a", "pnpm", "tauri-driver"], {
        stdio: [null, process.stdout, process.stderr],
        env,
        shell: true,
      });
    } else {
      console.log("Starting tauri-driver (ONBOARDING=0)...");
      tauriDriver = spawn("pnpm", ["tauri-driver"], {
        stdio: [null, process.stdout, process.stderr],
        env,
        shell: true,
      });
    }

    tauriDriver.on("error", (error) => {
      console.error("tauri-driver error:", error);
      process.exit(1);
    });

    tauriDriver.on("exit", (code) => {
      if (!killedTauriDriver) {
        console.error("tauri-driver exited with code:", code);
        process.exit(1);
      }
    });

    // Wait for tauri-driver to initialize its proxy server
    await waitTauriDriverReady();
  },

  afterSession: () => {
    closeTauriDriver();
  },

  onComplete: () => {
    killedTestRunnerBackend = true;
    testRunnerBackend?.kill();
  },
};

async function sleep(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}
