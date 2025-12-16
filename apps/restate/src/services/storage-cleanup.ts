import * as restate from "@restatedev/restate-sdk-cloudflare-workers/fetch";
import { serde } from "@restatedev/restate-sdk-zod";
import { z } from "zod";

import { type Env } from "../env";
import { deleteFile, listAllFiles } from "../supabase";

const CleanupInput = z.object({
  cutoffHours: z.number().min(1).default(24),
});

export type CleanupInputType = z.infer<typeof CleanupInput>;

const CleanupResult = z.object({
  deletedCount: z.number(),
  failedCount: z.number(),
  totalScanned: z.number(),
  errors: z.array(z.string()),
});

export type CleanupResultType = z.infer<typeof CleanupResult>;

export const storageCleanup = restate.service({
  name: "StorageCleanup",
  handlers: {
    cleanupOldFiles: restate.handlers.handler(
      { input: serde.zod(CleanupInput) },
      async (
        ctx: restate.Context,
        input: CleanupInputType,
      ): Promise<CleanupResultType> => {
        const env = ctx.request().extraArgs[0] as Env;
        const cutoffMs = input.cutoffHours * 60 * 60 * 1000;
        const cutoffDate = new Date(Date.now() - cutoffMs);

        const files = await ctx.run("list-files", () => listAllFiles(env));

        let deletedCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (const file of files) {
          const fileDate = new Date(file.created_at);
          if (fileDate < cutoffDate) {
            const filePath = file.name;
            try {
              await ctx.run(`delete-${filePath}`, () =>
                deleteFile(env, filePath),
              );
              deletedCount++;
            } catch (err) {
              failedCount++;
              const errorMsg =
                err instanceof Error ? err.message : "Unknown error";
              errors.push(`Failed to delete ${filePath}: ${errorMsg}`);
              if (errors.length >= 10) {
                errors.push("... (truncated, too many errors)");
                break;
              }
            }
          }
        }

        return {
          deletedCount,
          failedCount,
          totalScanned: files.length,
          errors,
        };
      },
    ),
  },
});

export type StorageCleanup = typeof storageCleanup;
