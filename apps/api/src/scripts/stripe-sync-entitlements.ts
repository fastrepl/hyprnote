// https://github.com/supabase/stripe-sync-engine/blob/main/packages/sync-engine/README.md#syncing-a-single-entity
// Entitlements can not be synced with "stripe-sync-engine". So we need this script.
//
// Syncs entitlements for customers that are "worth looking at":
// 1. Customers with active/trialing/past_due subscriptions (should have entitlements)
// 2. Customers with existing entitlements (might need updates or cleanup)
//
// This handles both backfill (pre-webhook customers) and daily verification.
import { Effect, Schedule } from "effect";
import Stripe from "stripe";
import { parseArgs } from "util";

import { STRIPE_API_VERSION } from "../integration/stripe";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    "skip-recent-hours": {
      type: "string",
      default: "6",
    },
  },
  strict: true,
  allowPositionals: false,
});

const skipRecentHours = parseInt(values["skip-recent-hours"] ?? "6", 10);

const { STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Bun.env;

if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required environment variables");
}

const { createClient } = await import("@supabase/supabase-js");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
});

const isRateLimitError = (error: unknown): boolean =>
  error instanceof Stripe.errors.StripeError && error.code === "rate_limit";

const retryPolicy = Schedule.exponential("500 millis").pipe(
  Schedule.jittered,
  Schedule.whileInput(isRateLimitError),
  Schedule.intersect(Schedule.recurs(5)),
);

const fetchRecentlySyncedCustomers = (hours: number) =>
  Effect.gen(function* () {
    if (hours <= 0) return new Set<string>();

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = yield* Effect.promise(() =>
      supabaseAdmin
        .schema("stripe")
        .from("customers")
        .select("id")
        .gte("last_synced_at", cutoff),
    );

    if (error) {
      yield* Effect.logWarning(
        `Failed to fetch recently synced customers: ${error.message}`,
      );
      return new Set<string>();
    }

    return new Set((data ?? []).map((c) => c.id as string).filter(Boolean));
  });

const fetchCustomersToSync = Effect.gen(function* () {
  const [subscriptionsResult, entitlementsResult, recentlySynced] =
    yield* Effect.all([
      Effect.promise(() =>
        supabaseAdmin
          .schema("stripe")
          .from("subscriptions")
          .select("customer")
          .in("status", ["active", "trialing", "past_due"]),
      ),
      Effect.promise(() =>
        supabaseAdmin
          .schema("stripe")
          .from("active_entitlements")
          .select("customer"),
      ),
      fetchRecentlySyncedCustomers(skipRecentHours),
    ]);

  if (subscriptionsResult.error) {
    return yield* Effect.fail(
      new Error(
        `Failed to fetch subscriptions: ${subscriptionsResult.error.message}`,
      ),
    );
  }

  if (entitlementsResult.error) {
    return yield* Effect.fail(
      new Error(
        `Failed to fetch existing entitlements: ${entitlementsResult.error.message}`,
      ),
    );
  }

  const uniqueIds = new Set([
    ...(subscriptionsResult.data ?? [])
      .map((s) => s.customer as string)
      .filter(Boolean),
    ...(entitlementsResult.data ?? [])
      .map((e) => e.customer as string)
      .filter(Boolean),
  ]);

  const filtered = Array.from(uniqueIds).filter(
    (id) => !recentlySynced.has(id),
  );
  const skipped = uniqueIds.size - filtered.length;

  if (skipped > 0) {
    yield* Effect.log(
      `Skipping ${skipped} customers synced within the last ${skipRecentHours} hours`,
    );
  }

  return filtered;
});

const fetchCustomerEntitlements = (customerId: string) =>
  Effect.tryPromise({
    try: async () => {
      const entitlements: Stripe.Entitlements.ActiveEntitlement[] = [];
      for await (const entitlement of stripe.entitlements.activeEntitlements.list(
        {
          customer: customerId,
        },
      )) {
        entitlements.push(entitlement);
      }
      return entitlements;
    },
    catch: (error) => error,
  }).pipe(Effect.retry(retryPolicy));

const deleteAllEntitlements = (customerId: string) =>
  Effect.gen(function* () {
    const { error, count } = yield* Effect.promise(() =>
      supabaseAdmin
        .schema("stripe")
        .from("active_entitlements")
        .delete({ count: "exact" })
        .eq("customer", customerId),
    );

    if (error) {
      yield* Effect.logError(
        `Failed to delete entitlements for ${customerId}: ${error.message}`,
      );
      return { updated: 0, deleted: 0, hasError: true };
    }

    return { updated: 0, deleted: count ?? 0, hasError: false };
  });

const syncEntitlements = (
  customerId: string,
  entitlements: Stripe.Entitlements.ActiveEntitlement[],
) =>
  Effect.gen(function* () {
    const activeLookupKeys = entitlements.map((e) => e.lookup_key);

    const { error: deleteError, count: deleteCount } = yield* Effect.promise(
      () =>
        supabaseAdmin
          .schema("stripe")
          .from("active_entitlements")
          .delete({ count: "exact" })
          .eq("customer", customerId)
          .not("lookup_key", "in", `(${activeLookupKeys.join(",")})`),
    );

    if (deleteError) {
      yield* Effect.logError(
        `Failed to delete stale entitlements for ${customerId}: ${deleteError.message}`,
      );
      return { updated: 0, deleted: 0, hasError: true };
    }

    const records = entitlements.map((entitlement) => ({
      id: entitlement.id,
      object: entitlement.object,
      livemode: entitlement.livemode,
      feature: entitlement.feature,
      customer: customerId,
      lookup_key: entitlement.lookup_key,
      last_synced_at: new Date().toISOString(),
    }));

    const { error: upsertError } = yield* Effect.promise(() =>
      supabaseAdmin
        .schema("stripe")
        .from("active_entitlements")
        .upsert(records, { onConflict: "customer,lookup_key" }),
    );

    if (upsertError) {
      yield* Effect.logError(
        `Failed to upsert entitlements for ${customerId}: ${upsertError.message}`,
      );
      return { updated: 0, deleted: deleteCount ?? 0, hasError: true };
    }

    return {
      updated: entitlements.length,
      deleted: deleteCount ?? 0,
      hasError: false,
    };
  });

const updateCustomerLastSyncedAt = (customerId: string) =>
  Effect.promise(() =>
    supabaseAdmin
      .schema("stripe")
      .from("customers")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", customerId),
  );

const processCustomer = (customerId: string) =>
  Effect.gen(function* () {
    const entitlements = yield* fetchCustomerEntitlements(customerId);

    const result =
      entitlements.length === 0
        ? yield* deleteAllEntitlements(customerId)
        : yield* syncEntitlements(customerId, entitlements);

    if (!result.hasError) {
      yield* updateCustomerLastSyncedAt(customerId);
    }

    return result;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(
          `Failed to process customer ${customerId}: ${error}`,
        );
        return { updated: 0, deleted: 0, hasError: true };
      }),
    ),
  );

const program = Effect.gen(function* () {
  yield* Effect.log("Starting Stripe entitlements sync...");
  yield* Effect.log(
    "Fetching customers with active subscriptions or existing entitlements...",
  );

  const customerIds = yield* fetchCustomersToSync;

  yield* Effect.log(`Found ${customerIds.length} customers to process`);

  let processed = 0;
  let totalUpdated = 0;
  let totalDeleted = 0;
  let totalErrors = 0;

  for (const customerId of customerIds) {
    const result = yield* processCustomer(customerId);
    processed++;
    totalUpdated += result.updated ?? 0;
    totalDeleted += result.deleted;
    if (result.hasError) totalErrors++;

    if (processed % 100 === 0) {
      yield* Effect.log(`Progress: ${processed}/${customerIds.length}`);
    }
  }

  yield* Effect.log(
    `Sync complete: processed=${processed}, updated=${totalUpdated}, deleted=${totalDeleted}, errors=${totalErrors}`,
  );
});

Effect.runPromise(program).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
