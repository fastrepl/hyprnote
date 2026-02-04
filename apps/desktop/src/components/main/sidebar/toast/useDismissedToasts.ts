import { useCallback, useMemo } from "react";

import * as main from "../../../../store/tinybase/store/main";

export function useDismissedToasts(): {
  dismissedToasts: string[];
  dismissToast: (id: string) => void;
  isDismissed: (id: string) => boolean;
} {
  const store = main.UI.useStore(main.STORE_ID);
  const dismissedToastsValue = main.UI.useValue("dismissed_toasts", store);

  const dismissedToasts = useMemo(() => {
    if (typeof dismissedToastsValue === "string") {
      try {
        const parsed = JSON.parse(dismissedToastsValue);
        if (Array.isArray(parsed)) {
          return parsed.filter((id) => typeof id === "string") as string[];
        }
      } catch {
        return [];
      }
    }
    return [];
  }, [dismissedToastsValue]);

  const dismissedSet = useMemo(
    () => new Set(dismissedToasts),
    [dismissedToasts],
  );

  const dismissToast = useCallback(
    (id: string) => {
      if (!store || dismissedSet.has(id)) {
        return;
      }

      const updated = [...dismissedToasts, id];
      store.setValue("dismissed_toasts", JSON.stringify(updated));
    },
    [store, dismissedToasts, dismissedSet],
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
