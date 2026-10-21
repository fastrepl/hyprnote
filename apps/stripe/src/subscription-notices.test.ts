import { describe, expect, test } from "bun:test";
import type Stripe from "stripe";

import {
  sendSubscriptionAcknowledgment,
  sendSubscriptionNotice,
  type SubscriptionNoticeDependencies,
} from "./subscription-notices";

const now = 1_800_000_000;
const day = 86_400;
function fixture() {
  const sent: Array<{
    key: string;
    kind: string;
    email: string;
    variables: Record<string, string | number>;
  }> = [];
  const subscription = {
    id: "sub_notice",
    customer: "cus_notice",
    status: "active",
    latest_invoice: { status: "paid" },
    items: {
      data: [
        {
          quantity: 3,
          current_period_end: now + 30 * day,
          price: {
            unit_amount: 12000,
            recurring: { interval: "year", interval_count: 1 },
          },
        },
      ],
    },
  } as unknown as Stripe.Subscription;
  const customer = {
    id: "cus_notice",
    email: "owner@example.com",
    name: "Ada",
    metadata: { workspaceId: "team" },
  } as unknown as Stripe.Customer;
  const deps: SubscriptionNoticeDependencies = {
    getSubscription: async () => subscription,
    getCustomer: async () => customer,
    previewInvoice: async () =>
      ({ currency: "usd", total: 32400 }) as Stripe.Invoice,
    now: () => now,
    deliver: async (key, kind, email, variables) => {
      sent.push({ key, kind, email, variables });
    },
  };
  return { subscription, customer, deps, sent };
}
function event(type: Stripe.Event.Type, object: unknown) {
  return { id: "evt_notice", type, data: { object } } as Stripe.Event;
}

describe("subscription notices", () => {
  test("paid creation and trial conversion disclose Team totals and use a subscription key across event types", async () => {
    const { deps, subscription, sent } = fixture();
    subscription.status = "trialing";
    await sendSubscriptionAcknowledgment(
      event("customer.subscription.created", subscription),
      deps,
    );
    expect(sent).toHaveLength(0);
    subscription.status = "active";
    for (const type of [
      "customer.subscription.created",
      "customer.subscription.updated",
    ] as const) {
      await sendSubscriptionAcknowledgment(event(type, subscription), deps);
    }
    await sendSubscriptionAcknowledgment(
      event("invoice.paid", {
        parent: { subscription_details: { subscription: subscription.id } },
      }),
      deps,
    );
    expect(new Set(sent.map((s) => s.key))).toEqual(
      new Set(["subscription-ack:sub_notice"]),
    );
    expect(sent[0].variables).toMatchObject({
      planName: "Anarlog Team (3 seats)",
      billingPeriod: "yearly (every 12 months)",
    });
    expect(sent[0].variables.cancellationUrl).toContain(
      "mailto:team@fastrepl.com?",
    );
    expect(sent[0].variables.price).toContain("USD 324.00");
    expect(sent[0].variables.renewalDate).toContain("UTC");
  });

  test("monthly Pro upgrades acknowledge only an active paid invoice", async () => {
    const { deps, subscription, customer, sent } = fixture();
    customer.metadata = { userId: "user" };
    subscription.items.data[0].price.recurring!.interval = "month";
    subscription.latest_invoice = { status: "open" } as Stripe.Invoice;
    await sendSubscriptionAcknowledgment(
      event("customer.subscription.updated", subscription),
      deps,
    );
    expect(sent).toHaveLength(0);
    subscription.latest_invoice = { status: "paid" } as Stripe.Invoice;
    await sendSubscriptionAcknowledgment(
      event("invoice.paid", { subscription: subscription.id }),
      deps,
    );
    expect(sent[0].variables.planName).toBe("Anarlog Pro");
    expect(sent[0].variables.cancellationUrl).toBe(
      "https://anarlog.so/app/portal",
    );
    expect(sent[0].variables.billingPeriod).toBe("monthly (every month)");
    await sendSubscriptionNotice(subscription.id, "renewal", deps);
    expect(sent).toHaveLength(1);
  });

  test("Autumn customers with conflicting Anarlog ownership never receive either notice", async () => {
    const { deps, subscription, customer, sent } = fixture();
    customer.metadata.autumn_id = "char";
    deps.previewInvoice = async () => {
      throw new Error("must not inspect Char invoices");
    };
    await sendSubscriptionAcknowledgment(
      event("customer.subscription.updated", subscription),
      deps,
    );
    await sendSubscriptionNotice(subscription.id, "renewal", deps);
    expect(sent).toHaveLength(0);
  });

  test("yearly reminders catch up from 30 through 15 days and get a new key each renewal", async () => {
    const { deps, subscription, sent } = fixture();
    for (const days of [45, 31, 30, 20, 15, 14, -1]) {
      subscription.items.data[0].current_period_end = now + days * day;
      await sendSubscriptionNotice(subscription.id, "renewal", deps);
    }
    expect(sent.map((s) => s.key)).toEqual(
      [30, 20, 15].map(
        (days) => `subscription-renewal:sub_notice:${now + days * day}`,
      ),
    );
  });

  test("current cancellation and paused state suppress stale webhook and renewal notices", async () => {
    const { deps, subscription, sent } = fixture();
    subscription.cancel_at_period_end = true;
    await sendSubscriptionAcknowledgment(
      event("customer.subscription.created", {
        id: subscription.id,
        status: "active",
      }),
      deps,
    );
    await sendSubscriptionNotice(subscription.id, "renewal", deps);
    subscription.cancel_at_period_end = false;
    subscription.status = "paused";
    await sendSubscriptionNotice(subscription.id, "renewal", deps);
    expect(sent).toHaveLength(0);
  });
});
