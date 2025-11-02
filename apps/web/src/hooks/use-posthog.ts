import { usePostHog } from "@posthog/react";
import { useCallback } from "react";

export { usePostHog };

/**
 * Hook for type-safe PostHog event tracking
 */
export function useAnalytics() {
  const posthog = usePostHog();

  const track = useCallback(
    (eventName: string, properties?: Record<string, any>) => {
      if (!posthog) {
        return;
      }
      posthog.capture(eventName, properties);
    },
    [posthog],
  );

  const identify = useCallback(
    (userId: string, properties?: Record<string, any>) => {
      if (!posthog) {
        return;
      }
      posthog.identify(userId, properties);
    },
    [posthog],
  );

  const reset = useCallback(() => {
    if (!posthog) {
      return;
    }
    posthog.reset();
  }, [posthog]);

  return {
    track,
    identify,
    reset,
    posthog,
  };
}
