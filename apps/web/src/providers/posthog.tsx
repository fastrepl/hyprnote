import posthog from "posthog-js";
import { useEffect } from "react";

import { PostHogProvider as PostHogReactProvider } from "@posthog/react";
import { env } from "../env";

posthog.init(env.VITE_POSTHOG_API_KEY || "", {
  api_host: env.VITE_POSTHOG_HOST,
  autocapture: true,
  capture_pageview: false,
});

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PostHogReactProvider client={posthog}>{children}</PostHogReactProvider>;
}

export function usePostHogPageView() {
  useEffect(() => {
    posthog?.capture("$pageview");
  }, []);
}
