import * as restate from "@restatedev/restate-sdk-cloudflare-workers/fetch";

interface RateLimitState {
  windowStartMs: number;
  count: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxInWindow: number;
}

export const rateLimiter = restate.object({
  name: "RateLimiter",
  handlers: {
    checkAndConsume: async (
      ctx: restate.ObjectContext,
      config: RateLimitConfig,
    ): Promise<void> => {
      const now = await ctx.run("timestamp", () => Date.now());
      const state = (await ctx.get<RateLimitState>("state")) ?? {
        windowStartMs: now,
        count: 0,
      };

      const windowExpired = now - state.windowStartMs >= config.windowMs;
      const current = windowExpired ? { windowStartMs: now, count: 0 } : state;

      if (current.count >= config.maxInWindow) {
        ctx.set("state", current);
        throw new restate.TerminalError("Rate limit exceeded", {
          errorCode: 429,
        });
      }

      ctx.set("state", { ...current, count: current.count + 1 });
    },

    reset: async (ctx: restate.ObjectContext): Promise<void> => {
      ctx.clear("state");
    },
  },
});

export type RateLimiter = typeof rateLimiter;

export function limiter(ctx: restate.Context, key: string) {
  return ctx.objectClient<RateLimiter>(rateLimiter, key);
}
