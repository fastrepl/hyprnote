import type pg from "pg";

export async function deliverSubscriptionNotice(
  pool: Pick<pg.Pool, "connect">,
  key: string,
  payload: {
    transactionalId: string;
    email: string;
    dataVariables: Record<string, string | number>;
  },
  send: (message: typeof payload, key: string) => Promise<void>,
) {
  const client = await pool.connect();
  try {
    // Persist the attempt and exact payload before sending. Loops only deduplicates for 24 hours.
    await client.query(
      `INSERT INTO private.subscription_email_deliveries (delivery_key, payload)
      VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [key, JSON.stringify(payload)],
    );
    await client.query("BEGIN");
    const {
      rows: [receipt],
    } = await client.query(
      `SELECT payload, sent_at,
      attempted_at < clock_timestamp() - interval '23 hours' AS needs_review
      FROM private.subscription_email_deliveries WHERE delivery_key = $1 FOR UPDATE`,
      [key],
    );
    if (receipt.sent_at) return;
    if (receipt.needs_review)
      throw new Error(`Subscription email delivery requires review: ${key}`);
    await send(receipt.payload, key);
    await client.query(
      "UPDATE private.subscription_email_deliveries SET sent_at = clock_timestamp() WHERE delivery_key = $1",
      [key],
    );
    await client.query("COMMIT");
  } finally {
    try {
      await client.query("ROLLBACK");
      client.release();
    } catch (error) {
      client.release(
        error instanceof Error ? error : new Error("notice_rollback_failed"),
      );
    }
  }
}
