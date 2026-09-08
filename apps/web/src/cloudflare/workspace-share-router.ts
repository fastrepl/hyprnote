import { getWorkspaceShareSlug } from "../lib/workspace-share-host.ts";

const APP_ORIGIN = "https://anarlog.so";
const PLATFORM_HOSTS = new Set([
  "anarlog.so",
  "api.anarlog.so",
  "desktop.anarlog.so",
  "docs.anarlog.so",
  "models.anarlog.so",
  "www.anarlog.so",
]);

export const createWorkspaceShareOriginRequest = (
  request: Request,
  proxySecret: string,
) => {
  const incomingUrl = new URL(request.url);
  if (getWorkspaceShareSlug(incomingUrl.hostname) === null) return null;

  const originUrl = new URL(APP_ORIGIN);
  originUrl.pathname = incomingUrl.pathname;
  originUrl.search = incomingUrl.search;
  const originRequest = new Request(new Request(originUrl, request), {
    redirect: "manual",
  });
  // The hosting proxy can replace x-forwarded-host with its origin hostname.
  originRequest.headers.set("x-anarlog-workspace-share-host", incomingUrl.host);
  originRequest.headers.set("x-anarlog-workspace-share-token", proxySecret);
  originRequest.headers.set("x-forwarded-host", incomingUrl.host);
  originRequest.headers.set("x-forwarded-proto", "https");
  return originRequest;
};

export default {
  async fetch(
    request: Request,
    env: { WORKSPACE_SHARE_PROXY_SECRET?: string },
  ): Promise<Response> {
    const incomingUrl = new URL(request.url);
    const originRequest = createWorkspaceShareOriginRequest(
      request,
      env.WORKSPACE_SHARE_PROXY_SECRET ?? "",
    );

    if (originRequest === null) {
      if (PLATFORM_HOSTS.has(incomingUrl.hostname)) {
        const platformRequest = new Request(request);
        platformRequest.headers.delete("x-anarlog-workspace-share-host");
        platformRequest.headers.delete("x-anarlog-workspace-share-token");
        return fetch(platformRequest);
      }
      return new Response("Not found", { status: 404 });
    }

    if (incomingUrl.protocol !== "https:") {
      incomingUrl.protocol = "https:";
      return Response.redirect(incomingUrl, 308);
    }

    if (!env.WORKSPACE_SHARE_PROXY_SECRET) {
      return new Response("Sharing domain unavailable", { status: 503 });
    }

    const response = await fetch(originRequest);
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) {
      return response;
    }

    const redirectUrl = new URL(location, originRequest.url);
    if (redirectUrl.origin !== APP_ORIGIN) return response;

    redirectUrl.host = incomingUrl.host;
    const headers = new Headers(response.headers);
    headers.set("location", redirectUrl.toString());
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
