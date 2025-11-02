import { PostHogProvider as PostHogReactProvider } from "@posthog/react";
import posthog from "posthog-js";
import { useEffect } from "react";

if (typeof window !== "undefined") {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

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
