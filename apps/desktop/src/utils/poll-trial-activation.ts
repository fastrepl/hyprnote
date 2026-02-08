import type { Session } from "@supabase/supabase-js";

import { commands as authCommands } from "@hypr/plugin-auth";

const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 5000;
const BACKOFF_FACTOR = 1.5;
const MAX_ATTEMPTS = 10;

export type PollResult =
  | { status: "activated"; session: Session }
  | { status: "timeout" }
  | { status: "aborted" };

type PollOptions = {
  refreshSession: () => Promise<Session | null>;
  signal?: AbortSignal;
};

export async function pollForTrialActivation(
  options: PollOptions,
): Promise<PollResult> {
  let delay = INITIAL_DELAY_MS;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (options.signal?.aborted) {
      return { status: "aborted" };
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        if (options.signal) {
          const onAbort = () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          };
          options.signal.addEventListener("abort", onAbort, { once: true });
        }
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return { status: "aborted" };
      }
      throw e;
    }

    if (options.signal?.aborted) {
      return { status: "aborted" };
    }

    try {
      const session = await options.refreshSession();
      if (session) {
        const result = await authCommands.decodeClaims(session.access_token);
        if (result.status === "ok") {
          const entitlements = result.data.entitlements ?? [];
          if (entitlements.includes("hyprnote_pro")) {
            return { status: "activated", session };
          }
        }
      }
    } catch (error) {
      console.warn(
        `Trial activation poll attempt ${attempt + 1} failed:`,
        error,
      );
    }

    delay = Math.min(delay * BACKOFF_FACTOR, MAX_DELAY_MS);
  }

  return { status: "timeout" };
}
