import { flowSearchSchema } from "../functions/desktop-flow.ts";
import {
  resolveAuthFlowContext,
  toAuthFlowSearch,
  type AuthFlowContext,
} from "./auth-flow-context.ts";

const FLOW_STORAGE_KEY = "anarlog.auth-flow-context";
const FLOW_MAX_AGE_MS = 15 * 60_000;
const flowContextSchema = flowSearchSchema({});

export function rememberAuthFlowContext(
  context: AuthFlowContext,
  now = Date.now(),
) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      FLOW_STORAGE_KEY,
      JSON.stringify({ context, createdAt: now }),
    );
  } catch {}
}

export function restoreRootAuthCallback(now = Date.now()) {
  if (typeof window === "undefined" || window.location.pathname !== "/")
    return false;

  const params = new URLSearchParams(window.location.search);
  if (
    !params.get("code") &&
    !params.get("error") &&
    !(params.get("token_hash") && params.get("type"))
  )
    return false;

  if (!params.has("flow")) {
    try {
      const raw = window.sessionStorage.getItem(FLOW_STORAGE_KEY);
      if (raw) {
        window.sessionStorage.removeItem(FLOW_STORAGE_KEY);
        const stored = JSON.parse(raw);
        const parsed = flowContextSchema.safeParse(stored.context);
        const age = now - stored.createdAt;
        if (
          parsed.success &&
          typeof stored.createdAt === "number" &&
          age >= 0 &&
          age <= FLOW_MAX_AGE_MS
        ) {
          const context = resolveAuthFlowContext({
            ...parsed.data,
            redirect:
              typeof stored.context.redirect === "string"
                ? stored.context.redirect
                : undefined,
          });
          for (const [key, value] of Object.entries(
            toAuthFlowSearch(context),
          )) {
            if (value !== undefined && !params.has(key)) params.set(key, value);
          }
        }
      }
    } catch {}
  }

  // The prerendered homepage can hydrate without running its auth beforeLoad.
  window.location.replace(`/callback/auth/?${params.toString()}`);
  return true;
}
