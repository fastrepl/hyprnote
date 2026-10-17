const FLOW_STORAGE_KEY = "anarlog.auth-flow-context";

export function rememberAuthFlowContext(
  context: {
    flow: "desktop" | "web";
    scheme?: string;
    desktop_state?: string;
    redirect?: string;
  },
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

export function forgetAuthFlowContext() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FLOW_STORAGE_KEY);
  } catch {}
}

// Inlined into <head> via toString(), so it must stay self-contained.
// Only failed OAuth returns are handled here; successful root returns keep
// the regular route redirects so their own params decide the flow.
export function redirectRootAuthReturn(now = Date.now()) {
  const storageKey = "anarlog.auth-flow-context";
  const maxAgeMs = 15 * 60_000;
  const location = window.location;
  if (location.pathname !== "/") return false;

  const params = new URLSearchParams(location.search);
  if (!params.has("error") && !params.has("error_code")) return false;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    window.sessionStorage.removeItem(storageKey);
    const stored = raw ? JSON.parse(raw) : null;
    const context = stored?.context;
    const age = now - stored?.createdAt;
    if (
      !params.has("flow") &&
      context &&
      (context.flow === "desktop" || context.flow === "web") &&
      age >= 0 &&
      age <= maxAgeMs
    ) {
      params.set("flow", context.flow);
      if (/^[a-z][a-z-]{0,31}$/.test(context.scheme ?? ""))
        params.set("scheme", context.scheme);
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          context.desktop_state ?? "",
        )
      )
        params.set("desktop_state", context.desktop_state);
      if (typeof context.redirect === "string" && !params.has("redirect"))
        params.set("redirect", context.redirect);
    }
  } catch {}

  document.documentElement.style.visibility = "hidden";
  // A failed OAuth return restarts sign-in instead of showing an error page.
  const retry = new URLSearchParams();
  const flow = params.get("flow") === "desktop" ? "desktop" : "web";
  retry.set("flow", flow);
  const scheme = params.get("scheme");
  if (scheme || flow === "desktop") retry.set("scheme", scheme || "anarlog");
  for (const key of ["desktop_state", "redirect"]) {
    const value = params.get(key);
    if (value) retry.set(key, value);
  }
  location.replace(`/auth?${retry.toString()}`);
  return true;
}
