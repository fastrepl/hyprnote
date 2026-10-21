import type Stripe from "stripe";

import { getCustomerOwner, isAutumnManagedCustomer } from "./customer-metadata";

const DAY = 86_400;

export type SubscriptionNoticeDependencies = {
  getSubscription: (id: string) => Promise<Stripe.Subscription>;
  getCustomer: (id: string) => Promise<Stripe.Customer | null>;
  previewInvoice: (id: string) => Promise<Stripe.Invoice>;
  deliver: (
    key: string,
    kind: "acknowledgment" | "renewal",
    email: string,
    variables: Record<string, string | number>,
  ) => Promise<void>;
  now: () => number;
};

export async function sendSubscriptionAcknowledgment(
  event: Stripe.Event,
  dependencies?: SubscriptionNoticeDependencies,
) {
  let id: string | undefined;
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    id = event.data.object.id;
  } else if (event.type === "invoice.paid") {
    const invoice = event.data.object;
    const subscription =
      invoice.parent?.subscription_details?.subscription ??
      (invoice as Stripe.Invoice & { subscription?: string }).subscription;
    id = typeof subscription === "string" ? subscription : subscription?.id;
  }
  if (!id) return;
  const deps = dependencies ?? (await defaultDependencies());
  if (!deps) return;
  await sendSubscriptionNotice(id, "acknowledgment", deps);
}

export async function sendSubscriptionNotice(
  id: string,
  kind: "acknowledgment" | "renewal",
  deps: SubscriptionNoticeDependencies,
) {
  // Re-fetch so delayed/out-of-order webhook payloads cannot resurrect old terms.
  const subscription = await deps.getSubscription(id);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const customer = await deps.getCustomer(customerId);
  if (!customer?.email || isAutumnManagedCustomer(customer.metadata)) return;
  const owner = getCustomerOwner(customer.metadata);
  if (
    !owner ||
    subscription.status !== "active" ||
    subscription.cancel_at_period_end ||
    subscription.cancel_at ||
    subscription.pause_collection
  )
    return;
  const items = subscription.items.data;
  const item = items[0];
  if (
    !item ||
    items.some(
      (i) =>
        !i.price.recurring ||
        i.price.recurring.interval !== item.price.recurring?.interval ||
        i.price.recurring.interval_count !== 1 ||
        i.current_period_end !== item.current_period_end,
    )
  ) {
    throw new Error("Unsupported subscription notice billing periods");
  }
  const interval = item.price.recurring!.interval;
  if (interval !== "month" && interval !== "year")
    throw new Error("Unsupported subscription notice interval");
  if (
    !items.some(
      (i) => (i.price.unit_amount ?? Number(i.price.unit_amount_decimal)) > 0,
    )
  )
    return;
  const renewal = item.current_period_end;
  const remaining = renewal - deps.now();
  if (
    kind === "renewal" &&
    (interval !== "year" || remaining > 30 * DAY || remaining < 15 * DAY)
  )
    return;
  if (remaining <= 0) return;
  if (kind === "acknowledgment") {
    const invoice = subscription.latest_invoice;
    if (!invoice || typeof invoice === "string" || invoice.status !== "paid")
      return;
  }
  const preview = await deps.previewInvoice(id);
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: preview.currency,
    currencyDisplay: "code",
  });
  // Stripe keeps ISK and UGX in hundredths despite their zero-decimal display.
  const digits = ["isk", "ugx"].includes(preview.currency)
    ? 2
    : (formatter.resolvedOptions().maximumFractionDigits ?? 2);
  const amount = formatter.format(preview.total / 10 ** digits);
  await deps.deliver(
    kind === "acknowledgment"
      ? `subscription-ack:${id}`
      : `subscription-renewal:${id}:${renewal}`,
    kind,
    customer.email,
    {
      firstName: customer.name?.trim().split(/\s+/)[0] || "there",
      planName:
        owner.kind === "workspace"
          ? `Anarlog Team (${item.quantity ?? 1} seats)`
          : "Anarlog Pro",
      price: `${amount} (estimated next invoice total, including applicable discounts and tax; account credits may reduce the charge)`,
      billingPeriod:
        interval === "year"
          ? "yearly (every 12 months)"
          : "monthly (every month)",
      renewalDate:
        new Date(renewal * 1000).toLocaleDateString("en-US", {
          timeZone: "UTC",
          year: "numeric",
          month: "long",
          day: "numeric",
        }) + " (UTC)",
      cancellationUrl:
        owner.kind === "workspace"
          ? `mailto:team@fastrepl.com?${`subject=${encodeURIComponent("Cancel my Anarlog Team subscription")}&body=${encodeURIComponent(`Please cancel automatic renewal of my Anarlog Team subscription ${id}.`)}`}`
          : "https://anarlog.so/app/portal",
    },
  );
}

async function defaultDependencies() {
  const { env } = await import("./env");
  if (!env.SUBSCRIPTION_NOTICES_ENABLED) return null;
  const { subscriptionNoticeDependencies } =
    await import("./subscription-notice-runtime");
  return subscriptionNoticeDependencies;
}
