export type AccountAnalyticsEvent = {
  id: string;
  event_name: "account_created" | "account_confirmed";
  user_id: string;
  occurred_at: string;
  properties: Record<string, unknown>;
  historical: boolean;
};

const ACCOUNT_GROUP_TYPE = "account";

function eventUuid(insertId: string) {
  const bytes = createHash("sha256").update(insertId).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function groupAccountAnalyticsEvents(events: AccountAnalyticsEvent[]) {
  return [
    events.filter((event) => !event.historical),
    events.filter((event) => event.historical),
  ].filter((group) => group.length > 0);
}

export async function sendPostHogBatch({
  events,
  projectToken,
  host,
  fetcher = fetch,
}: {
  events: AccountAnalyticsEvent[];
  projectToken: string;
  host: string;
  fetcher?: typeof fetch;
}) {
  if (events.length === 0) {
    return;
  }

  const response = await fetcher(`${host.replace(/\/+$/, "")}/batch/`, {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: projectToken,
      historical_migration: events.every((event) => event.historical),
      batch: events.flatMap((event) => {
        const capturedEvent = {
          event: event.event_name,
          uuid: eventUuid(`${event.event_name}:${event.user_id}`),
          properties: {
            ...event.properties,
            distinct_id: event.user_id,
            $groups: {
              [ACCOUNT_GROUP_TYPE]: event.user_id,
            },
            $insert_id: `${event.event_name}:${event.user_id}`,
          },
          timestamp: event.occurred_at,
        };

        if (event.event_name !== "account_created") {
          return [capturedEvent];
        }

        const setProperties =
          event.properties["$set"] &&
          typeof event.properties["$set"] === "object" &&
          !Array.isArray(event.properties["$set"])
            ? (event.properties["$set"] as Record<string, unknown>)
            : {};
        const email =
          typeof setProperties["email"] === "string"
            ? setProperties["email"]
            : null;

        return [
          {
            event: "$groupidentify",
            uuid: eventUuid(`account-group:${event.user_id}`),
            properties: {
              distinct_id: event.user_id,
              $group_type: ACCOUNT_GROUP_TYPE,
              $group_key: event.user_id,
              $group_set: {
                name: email ?? event.user_id,
                email,
                created_at:
                  setProperties["account_created_at"] ?? event.occurred_at,
              },
              $insert_id: `account-group:${event.user_id}`,
            },
            timestamp: event.occurred_at,
          },
          capturedEvent,
        ];
      }),
    }),
  });

  if (!response.ok) {
    throw new Error(`PostHog batch rejected with ${response.status}`);
  }

  const result = (await response.json()) as { status?: unknown };
  if (result.status !== "Ok") {
    throw new Error("PostHog batch returned an invalid acknowledgement");
  }
}
import { createHash } from "node:crypto";
