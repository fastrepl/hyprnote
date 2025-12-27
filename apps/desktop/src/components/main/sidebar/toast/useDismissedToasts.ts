import { useCallback, useMemo } from "react";

import { useConfigValue } from "../../../../config/use-config";
import * as settings from "../../../../store/tinybase/settings";

export function useDismissedToasts(): {
  dismissedToasts: string[];
  dismissToast: (id: string) => void;
  isDismissed: (id: string) => boolean;
} {
  const dismissedToasts = useConfigValue("dismissed_toasts");

  const setDismissedToasts = settings.UI.useSetValueCallback(
    "dismissed_toasts",
    (value: string) => value,
    [],
    settings.STORE_ID,
  );

  const dismissedSet = useMemo(
    () => new Set(dismissedToasts),
    [dismissedToasts],
  );

  const dismissToast = useCallback(
    (id: string) => {
      if (dismissedSet.has(id)) {
        return;
      }

      const updated = [...dismissedToasts, id];
      setDismissedToasts(JSON.stringify(updated));
    },
    [dismissedToasts, dismissedSet, setDismissedToasts],
  );

  const isDismissed = useCallback(
    (id: string) => dismissedSet.has(id),
    [dismissedSet],
  );

  return {
    dismissedToasts,
    dismissToast,
    isDismissed,
  };
}
