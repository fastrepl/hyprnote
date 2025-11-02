import posthog from "posthog-js";
import { useEffect } from "react";

import { PostHogProvider as PostHogReactProvider } from "@posthog/react";
import { env } from "../env";

if (typeof window !== "undefined") {
  const apiKey = env.VITE_POSTHOG_API_KEY;
  const apiHost = env.VITE_POSTHOG_HOST;

  if (apiKey) {
    posthog.init(apiKey, {
      api_host: apiHost,
    });
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PostHogReactProvider client={posthog}>{children}</PostHogReactProvider>;
}

export function usePostHogPageView() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      posthog.capture("$pageview");
    }
  }, []);
}
