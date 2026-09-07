import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

export async function deliverSignupAnalytics({
  supabase,
  apiKey,
  host,
  fetcher = fetch,
}: {
  supabase: SupabaseClient;
  apiKey: string;
  host: string;
  fetcher?: typeof fetch;
}) {
  const leaseId = randomUUID();
  const { data, error: claimError } = await supabase.rpc(
    "claim_signup_analytics_events",
    { p_lease_id: leaseId },
  );
  if (claimError) throw claimError;

  const events = (data ?? []) as { id: string; occurred_at: string }[];
  if (events.length === 0) return 0;

  // The queue ID identifies only this event. Reuse it after uncertain delivery
  // so PostHog can deduplicate retries without linking activity to an account.
  const response = await fetcher(`${host.replace(/\/+$/, "")}/batch/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      api_key: apiKey,
      historical_migration: events.some(
        (event) => Date.parse(event.occurred_at) < Date.now() - 86_400_000,
      ),
      batch: events.map(({ id, occurred_at }) => ({
        event: "account_created_anonymous",
        uuid: id,
        timestamp: new Date(occurred_at).toISOString(),
        properties: {
          distinct_id: id,
          $insert_id: id,
          $process_person_profile: false,
          $geoip_disable: true,
          surface: "api",
          analytics_schema_version: 1,
        },
      })),
    }),
  });
  if (!response.ok) {
    throw new Error(`PostHog signup capture failed with ${response.status}`);
  }

  const { data: completed, error: completionError } = await supabase.rpc(
    "complete_signup_analytics_events",
    { p_lease_id: leaseId },
  );
  if (completionError) throw completionError;
  if (completed !== events.length) {
    throw new Error("Signup analytics lease changed before completion");
  }
  return completed;
}
