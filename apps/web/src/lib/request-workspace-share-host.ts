import { getWorkspaceShareSlug } from "./workspace-share-host.ts";

const firstHeaderValue = (value: string | null) =>
  value
    ?.split(",")
    .map((part) => part.trim())
    .find(Boolean);

export const getRequestHost = (headers: Headers, proxySecret?: string) => {
  if (
    proxySecret &&
    headers.get("x-anarlog-workspace-share-token") === proxySecret
  ) {
    return firstHeaderValue(headers.get("x-anarlog-workspace-share-host"));
  }

  return (
    firstHeaderValue(headers.get("x-forwarded-host")) ??
    firstHeaderValue(headers.get("host"))
  );
};

export const getWorkspaceShareSlugFromHeaders = (
  headers: Headers,
  proxySecret?: string,
) => {
  const host = getRequestHost(headers, proxySecret);
  if (!host) return null;

  try {
    return getWorkspaceShareSlug(
      new URL(`https://${host}`).hostname.toLowerCase(),
    );
  } catch {
    return null;
  }
};
