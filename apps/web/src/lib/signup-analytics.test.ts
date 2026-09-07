import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import test from "node:test";

import { deliverSignupAnalytics } from "./signup-analytics.ts";

const events = [
  {
    id: "7fd274ca-2b60-48fa-b035-3bfb5f08b3e2",
    occurred_at: "2026-09-05T07:00:00+00:00",
    user_id: "must-not-be-exported",
    email: "private@example.com",
  },
  {
    id: "d8028eae-f5cb-4d69-a903-ac922161a9c6",
    occurred_at: "2026-09-05T07:00:00+00:00",
  },
];

function setup({
  queued = events,
  claimStatus = 200,
  completionStatus = 200,
  completed = queued.length,
}: {
  queued?: typeof events;
  claimStatus?: number;
  completionStatus?: number;
  completed?: number;
} = {}) {
  const calls: { name: string; body: { p_lease_id: string } }[] = [];
  const supabase = createClient(
    "https://supabase.example.test",
    "test-service-key",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input, init) => {
          const name = String(input).split("/").at(-1)!;
          calls.push({ name, body: JSON.parse(String(init?.body)) });
          if (name === "claim_signup_analytics_events") {
            return Response.json(
              claimStatus === 200 ? queued : { message: "Claim failed" },
              { status: claimStatus },
            );
          }
          assert.equal(name, "complete_signup_analytics_events");
          return Response.json(
            completionStatus === 200 ? completed : { message: "Ack failed" },
            { status: completionStatus },
          );
        },
      },
    },
  );
  return {
    calls,
    options: {
      supabase,
      apiKey: "test-project-token",
      host: "https://posthog.example.test///",
    },
  };
}

test("exports one anonymous event per signup and acknowledges its lease", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-08Z") });
  const { calls, options } = setup();
  const delivered = await deliverSignupAnalytics({
    ...options,
    fetcher: async (input, init) => {
      assert.equal(String(input), "https://posthog.example.test/batch/");
      assert.equal(init?.method, "POST");
      assert.ok(init?.signal instanceof AbortSignal);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.api_key, "test-project-token");
      assert.equal(body.historical_migration, true);
      assert.equal(body.batch.length, 2);
      assert.equal(
        new Set(body.batch.map((event: { uuid: string }) => event.uuid)).size,
        2,
      );
      assert.deepEqual(body.batch[0], {
        event: "account_created_anonymous",
        uuid: events[0].id,
        timestamp: "2026-09-05T07:00:00.000Z",
        properties: {
          distinct_id: events[0].id,
          $insert_id: events[0].id,
          $process_person_profile: false,
          $geoip_disable: true,
          surface: "api",
          analytics_schema_version: 1,
        },
      });
      assert.ok(!JSON.stringify(body).includes("must-not-be-exported"));
      assert.ok(!JSON.stringify(body).includes("private@example.com"));
      return Response.json({ status: 1 });
    },
  });
  assert.equal(delivered, 2);
  assert.deepEqual(
    calls.map(({ name }) => name),
    ["claim_signup_analytics_events", "complete_signup_analytics_events"],
  );
  assert.equal(calls[0].body.p_lease_id, calls[1].body.p_lease_id);
});

test("retries uncertain delivery with identical event deduplication fields", async () => {
  const bodies: unknown[] = [];
  const { options, calls } = setup();
  const fetcher: typeof fetch = async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)).batch);
    if (bodies.length === 1) throw new Error("Response lost after ingestion");
    return Response.json({ status: 1 });
  };
  await assert.rejects(
    deliverSignupAnalytics({ ...options, fetcher }),
    /Response lost/,
  );
  assert.equal(calls.length, 1);
  await deliverSignupAnalytics({ ...options, fetcher });
  assert.deepEqual(bodies[1], bodies[0]);
  assert.notEqual(calls[0].body.p_lease_id, calls[1].body.p_lease_id);
});

test("does not acknowledge rejected captures or send private error bodies", async () => {
  const { options, calls } = setup();
  await assert.rejects(
    deliverSignupAnalytics({
      ...options,
      fetcher: async () => new Response("private response", { status: 503 }),
    }),
    { message: "PostHog signup capture failed with 503" },
  );
  assert.equal(calls.length, 1);
});

test("empty queues and failed claims never contact PostHog", async () => {
  const fetcher: typeof fetch = async () => assert.fail("Unexpected capture");
  assert.equal(
    await deliverSignupAnalytics({ ...setup({ queued: [] }).options, fetcher }),
    0,
  );
  await assert.rejects(
    deliverSignupAnalytics({ ...setup({ claimStatus: 500 }).options, fetcher }),
    { message: "Claim failed" },
  );
});

test("reports incomplete acknowledgement so the leased records remain retryable", async () => {
  const fetcher: typeof fetch = async () => Response.json({ status: 1 });
  await assert.rejects(
    deliverSignupAnalytics({
      ...setup({ completionStatus: 500 }).options,
      fetcher,
    }),
    { message: "Ack failed" },
  );
  await assert.rejects(
    deliverSignupAnalytics({ ...setup({ completed: 0 }).options, fetcher }),
    /lease changed/,
  );
});
