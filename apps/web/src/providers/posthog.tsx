import { PostHogProvider as PostHogReactProvider } from "@posthog/react";
import posthog from "posthog-js";

import { env } from "../env";

if (typeof window !== "undefined" && env.VITE_POSTHOG_API_KEY) {
  posthog.init(env.VITE_POSTHOG_API_KEY, {
    api_host: env.VITE_POSTHOG_HOST,
    autocapture: true,
    capture_pageview: true,
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PostHogReactProvider client={posthog}>{children}</PostHogReactProvider>
  );
}
