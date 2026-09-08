import { createClient } from "@supabase/supabase-js";

import { sendLoopsTransactional } from "../lib/loops.ts";

const TRIAL_ENDING_TRANSACTIONAL_ID = "cmruoy7ix00zg0j1g74a7cycv";

type DueTrialReminder = {
  subscription_id: string;
  customer_email: string;
  customer_name: string | null;
  trial_end: number;
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
  const { data, error } = await supabase.rpc("list_due_trial_reminders");
  if (error) {
    throw error;
  }

  const reminders = (data ?? []) as DueTrialReminder[];
  const failures: Error[] = [];
  let delivered = 0;

  for (const reminder of reminders) {
    try {
      await sendLoopsTransactional({
        apiKey,
        transactionalId: TRIAL_ENDING_TRANSACTIONAL_ID,
        email: reminder.customer_email,
        dataVariables: {
          firstName: reminder.customer_name?.trim().split(/\s+/)[0] || "there",
        },
        idempotencyKey: `trial-ending:${reminder.subscription_id}:${reminder.trial_end}`,
      });
      delivered += 1;
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  console.log(
    JSON.stringify({
      due: reminders.length,
      delivered,
      failed: reminders.length - delivered,
    }),
  );

  if (failures.length > 0) {
    throw new AggregateError(failures, "Trial reminder delivery failed");
  }
};
