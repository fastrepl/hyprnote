import type { Options } from "@wdio/types";

export const config: Options.Testrunner = {
  specs: ["./test/specs/**/*.e2e.ts"],
  exclude: [],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      "tauri:options": {
        application: "../../target/release/Hyprnote Dev",
      },
    },
  ],
  logLevel: "info",
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },
  port: 4444,
  hostname: "localhost",
  path: "/",
};
