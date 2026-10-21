import { PGlite } from "@electric-sql/pglite";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import type pg from "pg";

import { deliverSubscriptionNotice } from "./subscription-notice-delivery";

test("durable receipts survive repeated events, retry the same payload, and stop uncertain sends after Loops expires", async () => {
  const db = new PGlite();
  await db.exec(
    "CREATE SCHEMA private; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;",
  );
  await db.exec(
    readFileSync(
      new URL(
        "../../../supabase/migrations/20261021045443_subscription_email_deliveries.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const pool = {
    connect: async () => ({
      query: (sql: string, params: unknown[]) => db.query(sql, params),
      release() {},
    }),
  } as unknown as Pick<pg.Pool, "connect">;
  const payload: Parameters<typeof deliverSubscriptionNotice>[2] = {
    transactionalId: "draft",
    email: "owner@example.com",
    dataVariables: { price: "USD 120" },
  };
  const deliveries: unknown[] = [];
  const providerKeys = new Set<string>();
  const send = async (body: typeof payload, key: string) => {
    if (!providerKeys.has(key)) {
      deliveries.push(body);
      providerKeys.add(key);
    }
  };
  try {
    await deliverSubscriptionNotice(pool, "ack:sub", payload, send);
    await db.exec(
      "UPDATE private.subscription_email_deliveries SET attempted_at = now() - interval '90 days'",
    );
    await deliverSubscriptionNotice(pool, "ack:sub", payload, send);
    expect(deliveries).toHaveLength(1);
    await expect(
      deliverSubscriptionNotice(
        pool,
        "renewal:sub:1",
        payload,
        async (body, key) => {
          await send(body, key);
          throw new Error("response lost");
        },
      ),
    ).rejects.toThrow("response lost");
    await deliverSubscriptionNotice(
      pool,
      "renewal:sub:1",
      { ...payload, email: "changed@example.com" },
      send,
    );
    expect(deliveries).toHaveLength(2);
    expect(deliveries[1]).toEqual(payload);
    await deliverSubscriptionNotice(pool, "renewal:sub:2", payload, send);
    expect(deliveries).toHaveLength(3);
    await db.exec(
      "INSERT INTO private.subscription_email_deliveries VALUES ('uncertain', '{}', now() - interval '24 hours', null)",
    );
    await expect(
      deliverSubscriptionNotice(pool, "uncertain", payload, send),
    ).rejects.toThrow("requires review");
    await db.exec("SET ROLE anon");
    await expect(
      db.query("SELECT * FROM private.subscription_email_deliveries"),
    ).rejects.toThrow();
  } finally {
    await db.close();
  }
});
