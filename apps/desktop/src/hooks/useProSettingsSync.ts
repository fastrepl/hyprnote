import { useEffect, useRef } from "react";

import { useBillingAccess } from "../billing";
import * as settings from "../store/tinybase/store/settings";
import { configureProSettings } from "../utils";

export function useProSettingsSync() {
  const { isPro, canStartTrial } = useBillingAccess();
  const store = settings.UI.useStore(settings.STORE_ID);
  const prevIsProRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!store) {
      return;
    }

    const wasNotPro = prevIsProRef.current === false;
    const isNowPro = isPro;

    if (wasNotPro && isNowPro) {
      configureProSettings(store);
    }

    if (!isPro && prevIsProRef.current !== null) {
      if (!canStartTrial.isPending && !canStartTrial.data) {
        const currentSttProvider = store.getValue("current_stt_provider");
        const currentSttModel = store.getValue("current_stt_model");
        const currentLlmProvider = store.getValue("current_llm_provider");

        if (currentSttProvider === "hyprnote" && currentSttModel === "cloud") {
          store.setValue("current_stt_model", "");
        }

        if (currentLlmProvider === "hyprnote") {
          store.setValue("current_llm_provider", "");
          store.setValue("current_llm_model", "");
        }
      }
    }

    prevIsProRef.current = isPro;
  }, [isPro, canStartTrial, store]);
}
