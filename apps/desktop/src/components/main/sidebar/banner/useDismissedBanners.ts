import { useCallback, useMemo } from "react";

import { useConfigValue } from "../../../../config/use-config";
import * as settings from "../../../../store/tinybase/settings";

export function useDismissedBanners(): {
  dismissedBanners: string[];
  dismissBanner: (id: string) => void;
  isDismissed: (id: string) => boolean;
} {
  const dismissedBanners = useConfigValue("dismissed_banners");

  const setDismissedBanners = settings.UI.useSetValueCallback(
    "dismissed_banners",
    (value: string) => value,
    [],
    settings.STORE_ID,
  );

  const dismissedSet = useMemo(() => new Set(dismissedBanners), [dismissedBanners]);

  const dismissBanner = useCallback(
    (id: string) => {
      if (dismissedSet.has(id)) {
        return;
      }

      const updated = [...dismissedBanners, id];
      setDismissedBanners(JSON.stringify(updated));
    },
    [dismissedBanners, dismissedSet, setDismissedBanners],
  );

  const isDismissed = useCallback((id: string) => dismissedSet.has(id), [dismissedSet]);

  return {
    dismissedBanners,
    dismissBanner,
    isDismissed,
  };
}
