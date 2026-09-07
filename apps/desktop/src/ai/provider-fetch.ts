import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

export const providerFetch: typeof fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (
    (url.protocol === "http:" || url.protocol === "https:") &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    if (!headers.has("Origin")) {
      // Tauri's unsafe-headers transport removes an empty Origin instead of
      // injecting the webview origin, which local servers can reject.
      headers.set("Origin", "");
      return tauriFetch(input, { ...init, headers });
    }
  }

  return tauriFetch(input, init);
};
