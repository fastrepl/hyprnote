import type Stripe from "stripe";

import { getCustomerOwner, isAutumnManagedCustomer } from "./customer-metadata";

const DAY = 86_400;

export type SubscriptionNoticeDependencies = {
  getSubscription: (id: string) => Promise<Stripe.Subscription>;
  getCustomer: (id: string) => Promise<Stripe.Customer | null>;
  previewInvoice: (id: string) => Promise<Stripe.Invoice>;
  listPaidInvoices: (
    id: string,
    created: number,
  ) => AsyncIterable<Stripe.Invoice>;
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
  if (!owner) return;
  const willRenew =
    subscription.status === "active" &&
    !subscription.cancel_at_period_end &&
    !subscription.cancel_at &&
    !subscription.pause_collection;
  if (kind === "renewal" && !willRenew) return;
  if (
    kind === "acknowledgment" &&
    subscription.status !== "active" &&
    subscription.status !== "canceled"
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
  const renewal = item.current_period_end;
  const remaining = renewal - deps.now();
  if (
    kind === "renewal" &&
    (interval !== "year" || remaining > 30 * DAY || remaining < 15 * DAY)
  )
    return;
  if (remaining <= 0) return;
  const invoice = subscription.latest_invoice;
  let paymentSummary = "";
  if (kind === "acknowledgment") {
    if (
      !invoice ||
      typeof invoice === "string" ||
      invoice.status !== "paid" ||
      (invoice.total <= 0 && invoice.amount_paid <= 0)
    )
      return;
    // A fully discounted invoice is free; a positive total settled by credits is still paid.
    for await (const earlier of deps.listPaidInvoices(id, invoice.created)) {
      if (
        earlier.id !== invoice.id &&
        (earlier.total > 0 || earlier.amount_paid > 0)
      )
        return;
    }
    paymentSummary = `Your paid invoice total is ${formatAmount(invoice.total, invoice.currency)}; the amount paid is ${formatAmount(invoice.amount_paid, invoice.currency)}. Discounts, tax, prorations, and account credits can make this differ from your next renewal.`;
  }
  const preview = willRenew ? await deps.previewInvoice(id) : null;
  if (kind === "renewal" && preview && preview.subtotal <= 0) return;
  const price = preview
    ? `${formatAmount(preview.total, preview.currency)} (estimated next invoice total, including applicable discounts and tax; account credits may reduce the charge)`
    : "";
  const renewalDate =
    new Date(renewal * 1000).toLocaleDateString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric",
    }) + " (UTC)";
  const renewalSummary = willRenew
    ? `Your plan renews automatically until you cancel. Your next renewal is ${renewalDate} for ${price}.`
    : subscription.pause_collection
      ? "Payment collection is currently paused. Check the billing portal for your current subscription status."
      : "Your subscription is canceled or scheduled to cancel and will not automatically renew.";
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
      price,
      paymentSummary,
      renewalSummary,
      billingPeriod:
        interval === "year"
          ? "yearly (every 12 months)"
          : "monthly (every month)",
      renewalDate,
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

function formatAmount(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  });
  // Stripe keeps ISK and UGX in hundredths despite their zero-decimal display.
  const digits = ["isk", "ugx"].includes(currency)
    ? 2
    : (formatter.resolvedOptions().maximumFractionDigits ?? 2);
  return formatter.format(amount / 10 ** digits);
}
