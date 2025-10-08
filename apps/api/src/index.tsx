import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { proxy } from "hono/proxy";
import { z } from "zod";

import { getEnv } from "./env";
import { drizzlePersisterMiddleware } from "./middleware/drizzle";
import { supabaseMiddleware } from "./middleware/supabase";
import { renderer } from "./renderer";
import type { Env } from "./types";

const app = new Hono<Env>();
app.use(logger());
app.use("/v1", supabaseMiddleware());

app.get("/health", (c) => c.text("OK"));
app.get("/callback/auth", renderer, (c) => {
  const params = c.req.query();
  const code = params.code;
  const deeplink = "hypr://auth/callback?" + new URLSearchParams(params).toString();

  return c.render(
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div class="space-y-4">
          <p class="font-mono text-lg bg-gray-100 p-2 rounded">Code: {code}</p>
          <button
            id="open"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Open App
          </button>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
            function trigger() {
              const params = new URLSearchParams(window.location.search);
              const deeplink = 'hypr://auth/callback?' + new URLSearchParams(params).toString();
              window.open(deeplink);
            }

             window.addEventListener('load', () => {
              trigger();
            });
            
            document.getElementById('open').addEventListener('click', () => {
              trigger();
            });
          `,
          }}
        />
      </div>
    </div>,
  );
});

app.post(
  "/v1/write",
  drizzlePersisterMiddleware(),
  zValidator(
    "json",
    z.array(
      z.discriminatedUnion("operation", [
        z.object({
          table: z.string(),
          row_id: z.string(),
          operation: z.literal("delete"),
        }),
        z.object({
          table: z.string(),
          row_id: z.string(),
          data: z.record(z.string(), z.unknown()),
          operation: z.literal("update"),
        }),
      ]),
    ),
  ),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const body = c.req.valid("json");

    try {
      await db.transaction(async (tx) => {
        for (const change of body) {
          const tableName = sql.identifier(change.table);

          if (change.operation === "delete") {
            await tx.execute(
              sql`
                DELETE FROM ${tableName}
                WHERE id = ${change.row_id}
                  AND user_id = ${user.id}
              `,
            );
          } else {
            const protectedFields = new Set(["id", "user_id"]);
            const safeData = Object.fromEntries(
              Object.entries(change.data).filter(([key]) => !protectedFields.has(key)),
            );

            const columns = ["id", "user_id", ...Object.keys(safeData)];
            const values = [change.row_id, user.id, ...Object.values(safeData)];

            const columnIdentifiers = sql.join(
              columns.map((col) => sql.identifier(col)),
              sql.raw(", "),
            );

            const valuePlaceholders = sql.join(
              values.map((v) => sql`${v}`),
              sql.raw(", "),
            );

            const updateSet = sql.join(
              columns.slice(2).map((col) => {
                const colId = sql.identifier(col);
                return sql`${colId} = EXCLUDED.${colId}`;
              }),
              sql.raw(", "),
            );

            await tx.execute(
              sql`
                INSERT INTO ${tableName} (${columnIdentifiers}) 
                VALUES (${valuePlaceholders}) 
                ON CONFLICT (id) 
                DO UPDATE SET ${updateSet} 
                WHERE ${tableName}.user_id = ${user.id}
              `,
            );
          }
        }
      });

      return c.json({ message: "OK" });
    } catch (error) {
      return c.json({ error }, 500);
    }
  },
);

app.post("/v1/chat/completions", async (c) => {
  const { OPENAI_BASE_URL, OPENAI_DEFAULT_MODEL, OPENAI_API_KEY } = getEnv(c);
  const data = await c.req.json();

  const res = await proxy(
    `${OPENAI_BASE_URL}/chat/completions`,
    {
      method: "POST",
      body: JSON.stringify({
        ...data,
        model: OPENAI_DEFAULT_MODEL,
      }),
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    },
  );

  return res;
});

export default app;
