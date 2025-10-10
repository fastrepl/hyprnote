import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { drizzleMiddleware } from "../../middleware/drizzle";
import { supabaseAuthMiddleware } from "../../middleware/supabase";

const inputSchema = z.array(
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
);

export const Route = createFileRoute("/api/sync/write")({
  server: {
    middleware: [supabaseAuthMiddleware, drizzleMiddleware],
    handlers: {
      POST: async ({ request, context }) => {
        try {
          const body = await request.json();
          const changes = inputSchema.parse(body);

          await context.db.transaction(async (tx) => {
            for (const change of changes) {
              const tableName = sql.identifier(change.table);

              if (change.operation === "delete") {
                await tx.execute(
                  sql`
                    DELETE FROM ${tableName}
                    WHERE id = ${change.row_id}
                      AND user_id = ${context.user.id}
                  `,
                );
              } else {
                const protectedFields = new Set(["id", "user_id"]);
                const safeData = Object.fromEntries(
                  Object.entries(change.data).filter(([key]) => !protectedFields.has(key)),
                );

                const columns = ["id", "user_id", ...Object.keys(safeData)];
                const values = [change.row_id, context.user.id, ...Object.values(safeData)];

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
                    WHERE ${tableName}.user_id = ${context.user.id}
                  `,
                );
              }
            }
          });

          return new Response(JSON.stringify({ message: "OK" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
