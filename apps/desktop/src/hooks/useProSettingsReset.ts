import { useEffect, useRef } from "react";

import { useBillingAccess } from "../billing";
import * as settings from "../store/tinybase/store/settings";

export function useProSettingsReset() {
  const { isPro, canStartTrial } = useBillingAccess();
  const store = settings.UI.useStore(settings.STORE_ID);
  const hasResetRef = useRef(false);

  useEffect(() => {
    if (isPro || canStartTrial || hasResetRef.current || !store) {
      return;
    }

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

    hasResetRef.current = true;
  }, [isPro, canStartTrial, store]);
}
