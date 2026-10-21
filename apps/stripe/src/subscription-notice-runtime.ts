import pg from "pg";

import { getStripeCustomer } from "./billing-bridge";
import { env } from "./env";
import { captureOperationalError } from "./error-reporting";
import { stripe } from "./integration/stripe";
import { sendLoopsTransactional } from "./loops";
import { deliverSubscriptionNotice } from "./subscription-notice-delivery";
import {
  sendSubscriptionNotice,
  type SubscriptionNoticeDependencies,
} from "./subscription-notices";

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 3,
  connectionTimeoutMillis: 10_000,
});
pool.on("error", (error) =>
  captureOperationalError(error, { operation: "subscription_notice_database" }),
);

export const subscriptionNoticeDependencies: SubscriptionNoticeDependencies = {
  getSubscription: (id) =>
    stripe.subscriptions.retrieve(id, { expand: ["latest_invoice"] }),
  getCustomer: getStripeCustomer,
  previewInvoice: (id) => stripe.invoices.createPreview({ subscription: id }),
  listPaidInvoices: (id, created) =>
    stripe.invoices.list({
      subscription: id,
      status: "paid",
      created: { lte: created },
      limit: 100,
    }),
  now: () => Math.floor(Date.now() / 1000),
  async deliver(key, kind, email, dataVariables) {
    const transactionalId =
      kind === "acknowledgment"
        ? env.LOOPS_SUBSCRIPTION_ACKNOWLEDGMENT_ID
        : env.LOOPS_YEARLY_RENEWAL_ID;
    if (!transactionalId || !env.LOOPS_API_KEY)
      throw new Error("Subscription notice configuration missing");
    await deliverSubscriptionNotice(
      pool,
      key,
      { transactionalId, email, dataVariables },
      (payload, idempotencyKey) =>
        sendLoopsTransactional({
          ...payload,
          apiKey: env.LOOPS_API_KEY!,
          idempotencyKey,
          fetcher: (input, init) =>
            fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
        }),
    );
  },
};

export async function sendYearlyRenewalReminders(
  subscriptions: AsyncIterable<{ id: string }>,
  deps: SubscriptionNoticeDependencies,
  report: (error: unknown) => void,
) {
  for await (const subscription of subscriptions) {
    try {
      await sendSubscriptionNotice(subscription.id, "renewal", deps);
    } catch (error) {
      report(error);
    }
  }
}

export function startSubscriptionNoticeWorker() {
  if (!env.SUBSCRIPTION_NOTICES_ENABLED)
    return async () => {
      await pool.end();
    };
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = async () => {
    try {
      await sendYearlyRenewalReminders(
        stripe.subscriptions.list({ status: "active", limit: 100 }),
        subscriptionNoticeDependencies,
        (error) =>
          captureOperationalError(error, {
            operation: "subscription_renewal_notice",
          }),
      );
    } catch (error) {
      captureOperationalError(error, { operation: "subscription_notice_scan" });
    }
    if (!stopped)
      timer = setTimeout(
        () => {
          running = run();
        },
        60 * 60 * 1000,
      );
  };
  let running = run();
  return async () => {
    stopped = true;
    clearTimeout(timer);
    await running;
    await pool.end();
  };
}
