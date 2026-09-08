import assert from "node:assert/strict";
import test from "node:test";

import {
  groupAccountAnalyticsEvents,
  sendPostHogBatch,
  type AccountAnalyticsEvent,
} from "./account-analytics.ts";

const events: AccountAnalyticsEvent[] = [
  {
    id: "event-live",
    event_name: "account_created",
    user_id: "user-live",
    occurred_at: "2026-07-25T03:00:00.000Z",
    properties: { source: "supabase_auth" },
    historical: false,
  },
  {
    id: "event-historical",
    event_name: "account_confirmed",
    user_id: "user-historical",
    occurred_at: "2025-07-25T03:00:00.000Z",
    properties: { source: "supabase_auth" },
    historical: true,
  },
];

test("groups live and historical events into separate batches", () => {
  assert.deepEqual(
    groupAccountAnalyticsEvents(events).map((group) =>
      group.map((event) => event.id),
    ),
    [["event-live"], ["event-historical"]],
  );
});

test("sends stable distinct and insert IDs with original timestamps", async () => {
  let request: { url: string; init?: RequestInit } | undefined;

  await sendPostHogBatch({
    events: [events[1]],
    projectToken: "project-token",
    host: "https://us.i.posthog.com/",
    fetcher: async (url, init) => {
      request = { url: String(url), init };
      return Response.json({ status: "Ok" });
    },
  });

  assert.equal(request?.url, "https://us.i.posthog.com/batch/");
  const body = JSON.parse(String(request?.init?.body));

  assert.equal(body.historical_migration, true);
  assert.equal(body.batch[0].event, "account_confirmed");
  assert.equal(body.batch[0].properties.distinct_id, "user-historical");
  assert.deepEqual(body.batch[0].properties.$groups, {
    account: "user-historical",
  });
  assert.equal(
    body.batch[0].properties.$insert_id,
    "account_confirmed:user-historical",
  );
  assert.equal(body.batch[0].timestamp, "2025-07-25T03:00:00.000Z");
});

test("identifies new account groups before capturing signup events", async () => {
  let request: { init?: RequestInit } | undefined;

  await sendPostHogBatch({
    events: [events[0]],
    projectToken: "project-token",
    host: "https://us.i.posthog.com",
    fetcher: async (_url, init) => {
      request = { init };
      return Response.json({ status: "Ok" });
    },
  });

  const body = JSON.parse(String(request?.init?.body));
  assert.equal(body.batch.length, 2);
  assert.deepEqual(body.batch[0], {
    event: "$groupidentify",
    uuid: body.batch[0].uuid,
    properties: {
      distinct_id: "user-live",
      $group_type: "account",
      $group_key: "user-live",
      $group_set: {
        name: "user-live",
        email: null,
        created_at: "2026-07-25T03:00:00.000Z",
      },
      $insert_id: "account-group:user-live",
    },
    timestamp: "2026-07-25T03:00:00.000Z",
  });
  assert.deepEqual(body.batch[1].properties.$groups, {
    account: "user-live",
  });
});

test("surfaces PostHog ingestion errors", async () => {
  await assert.rejects(
    sendPostHogBatch({
      events: [events[0]],
      projectToken: "project-token",
      host: "https://us.i.posthog.com",
      fetcher: async () => new Response("invalid token", { status: 401 }),
    }),
    { message: "PostHog batch rejected with 401" },
  );
});

test("uncertain delivery retries preserve event UUIDs and account identity", async () => {
  const batches: unknown[] = [];
  const fetcher: typeof fetch = async (_url, init) => {
    assert.ok(init?.signal instanceof AbortSignal);
    const { batch } = JSON.parse(String(init?.body));
    batches.push(batch);
    for (const event of batch) {
      assert.match(
        event.uuid,
        /^[\da-f]{8}-[\da-f]{4}-8[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
      );
    }
    assert.equal(
      new Set(batch.map((event: { uuid: string }) => event.uuid)).size,
      batch.length,
    );
    if (batches.length === 1) throw new Error("Response lost after ingestion");
    return Response.json({ status: "Ok" });
  };
  const options = {
    events,
    projectToken: "project-token",
    host: "https://posthog.example.test",
    fetcher,
  };
  await assert.rejects(sendPostHogBatch(options), /Response lost/);
  await sendPostHogBatch(options);
  assert.deepEqual(batches[0], batches[1]);
});

test("rejects a malformed PostHog acknowledgement", async () => {
  await assert.rejects(
    sendPostHogBatch({
      events: [events[0]],
      projectToken: "project-token",
      host: "https://us.i.posthog.com",
      fetcher: async () => Response.json({ status: "Ignored" }),
    }),
    /PostHog batch returned an invalid acknowledgement/,
  );
});
