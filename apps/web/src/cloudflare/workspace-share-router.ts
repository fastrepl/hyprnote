import { getWorkspaceShareSlug } from "../lib/workspace-share-host.ts";

const APP_ORIGIN = "https://anarlog.netlify.app";
const PLATFORM_HOSTS = new Set([
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

  const originUrl = new URL(
    incomingUrl.pathname + incomingUrl.search,
    APP_ORIGIN,
  );
  const originRequest = new Request(originUrl, request);
  // Netlify replaces x-forwarded-host with the origin hostname.
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

    return fetch(originRequest);
  },
};
