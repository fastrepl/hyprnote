import assert from "node:assert/strict";
import test from "node:test";

import { runScheduledJob } from "./cron.ts";

test("scheduled jobs reject missing or invalid credentials before executing", async () => {
  let calls = 0;
  const run = async () => {
    calls++;
  };
  for (const secret of [undefined, "test-secret"]) {
    const response = await runScheduledJob(
      new Request("https://anarlog.so/api/cron/job"),
      run,
      {
        CRON_SECRET: secret,
        CRON_JOBS_ENABLED: "true",
      },
    );
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(calls, 0);
});

test("scheduled jobs remain idle until the migration switch is enabled", async () => {
  let calls = 0;
  const request = new Request("https://anarlog.so/api/cron/job", {
    headers: { authorization: "Bearer test-secret" },
  });
  const run = async () => {
    calls++;
  };
  const skipped = await runScheduledJob(request, run, {
    CRON_SECRET: "test-secret",
  });
  assert.deepEqual(await skipped.json(), { skipped: true });
  assert.equal(calls, 0);
  const completed = await runScheduledJob(request, run, {
    CRON_SECRET: "test-secret",
    CRON_JOBS_ENABLED: "true",
  });
  assert.deepEqual(await completed.json(), { success: true });
  assert.equal(calls, 1);
});

test("job failures reach the runtime instead of returning a successful cron response", async () => {
  const request = new Request("https://anarlog.so/api/cron/job", {
    headers: { authorization: "Bearer test-secret" },
  });
  await assert.rejects(
    runScheduledJob(
      request,
      async () => {
        throw new Error("Delivery failed");
      },
      {
        CRON_SECRET: "test-secret",
        CRON_JOBS_ENABLED: "true",
      },
    ),
    /Delivery failed/,
  );
});
