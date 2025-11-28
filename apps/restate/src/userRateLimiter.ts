import * as restate from "@restatedev/restate-sdk-cloudflare-workers";
import { z } from "zod";

const RateLimitState = z.object({
  windowStartMs: z.number(),
  count: z.number(),
});

const CheckAndConsumeRequest = z.object({
  windowMs: z.number(),
  maxInWindow: z.number(),
});

export const userRateLimiter = restate.object({
  name: "UserRateLimiter",
  handlers: {
    checkAndConsume: async (
      ctx: restate.ObjectContext,
      cfg: { windowMs: number; maxInWindow: number },
    ): Promise<void> => {
      const { windowMs, maxInWindow } = CheckAndConsumeRequest.parse(cfg);
      const now = await ctx.run("get-timestamp", () => Date.now());

      const current = (await ctx.get<z.infer<typeof RateLimitState>>(
        "state",
      )) ?? {
        windowStartMs: now,
        count: 0,
      };

      let state = current;

      if (now - state.windowStartMs >= windowMs) {
        state = { windowStartMs: now, count: 0 };
      }

      if (state.count >= maxInWindow) {
        ctx.set("state", state);
        throw new restate.TerminalError("Rate limit exceeded", {
          errorCode: 429,
        });
      }

      state = { windowStartMs: state.windowStartMs, count: state.count + 1 };
      ctx.set("state", state);
    },
  },
});

export type UserRateLimiter = typeof userRateLimiter;

export function limiterForUser(ctx: restate.Context, userId: string) {
  return ctx.objectClient<UserRateLimiter>(userRateLimiter, userId);
}
