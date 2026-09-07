import { getRequestHeaders } from "@tanstack/react-start/server";

import { env } from "@/env";
import { getRequestHost } from "@/lib/request-workspace-share-host";
import { isWorkspaceShareHostname } from "@/lib/workspace-share-host";

const PUBLIC_APP_HOSTS = new Set(["anarlog.so", "www.anarlog.so"]);

const LOCAL_APP_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export const getRequestAppOrigin = () => {
  const headers = getRequestHeaders();
  const host = getRequestHost(headers, env.WORKSPACE_SHARE_PROXY_SECRET);

  if (!host) {
    return env.VITE_APP_URL;
  }

  try {
    const parsed = new URL(`https://${host}`);
    const hostname = parsed.hostname.toLowerCase();

    if (PUBLIC_APP_HOSTS.has(hostname) || isWorkspaceShareHostname(hostname)) {
      return `https://${parsed.host}`;
    }

    if (import.meta.env.DEV && LOCAL_APP_HOSTS.has(hostname)) {
      return `http://${parsed.host}`;
    }
  } catch {
    return env.VITE_APP_URL;
  }

  return env.VITE_APP_URL;
};
