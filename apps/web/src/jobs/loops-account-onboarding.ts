import { createClient } from "@supabase/supabase-js";

import { sendLoopsEvent } from "../lib/loops.ts";

type AccountOnboardingEvent = {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
};

function requireEnvironmentVariable(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export default async () => {
  const supabase = createClient(
    requireEnvironmentVariable("SUPABASE_URL"),
    requireEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  const apiKey = requireEnvironmentVariable("LOOPS_KEY");
  const leaseId = crypto.randomUUID();
  const { data, error: claimError } = await supabase.rpc(
    "claim_account_onboarding_events",
    {
      p_lease_id: leaseId,
      p_limit: 100,
      p_lease_seconds: 300,
    },
  );
  if (claimError) {
    throw claimError;
  }

  const events = (data ?? []) as AccountOnboardingEvent[];
  const failures: Error[] = [];
  let delivered = 0;

  for (const event of events) {
    try {
      await sendLoopsEvent({
        apiKey,
        email: event.email,
        userId: event.user_id,
        eventName: "anarlogAccountConfirmed",
        firstName: event.first_name,
        idempotencyKey: `account-onboarding:${event.id}`,
      });

      const { data: completed, error: completionError } = await supabase.rpc(
        "complete_account_onboarding_events",
        {
          p_lease_id: leaseId,
          p_event_ids: [event.id],
        },
      );
      if (completionError) {
        throw completionError;
      }
      if (completed !== 1) {
        throw new Error(`Failed to complete onboarding event ${event.id}`);
      }
      delivered += 1;
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      failures.push(failure);

      const { error: failureError } = await supabase.rpc(
        "fail_account_onboarding_events",
        {
          p_lease_id: leaseId,
          p_event_ids: [event.id],
          p_error: failure.message,
        },
      );
      if (failureError) {
        failures.push(failureError);
      }
    }
  }

  console.log(
    JSON.stringify({
      claimed: events.length,
      delivered,
      failed: events.length - delivered,
    }),
  );

  if (failures.length > 0) {
    throw new AggregateError(failures, "Account onboarding delivery failed");
  }
};
