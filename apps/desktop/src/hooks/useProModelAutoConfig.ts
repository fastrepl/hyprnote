import { useEffect, useRef } from "react";

import { useBillingAccess } from "../billing";
import * as settings from "../store/tinybase/store/settings";

export function useProModelAutoConfig() {
  const { isPro } = useBillingAccess();
  const store = settings.UI.useStore(settings.STORE_ID);
  const prevIsProRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!store) {
      return;
    }

    const wasNotPro = prevIsProRef.current === false;
    const isNowPro = isPro === true;

    if (wasNotPro && isNowPro) {
      const currentSttProvider = store.getValue("current_stt_provider");
      const currentSttModel = store.getValue("current_stt_model");
      const currentLlmProvider = store.getValue("current_llm_provider");
      const currentLlmModel = store.getValue("current_llm_model");

      if (currentSttProvider && currentSttProvider !== "hyprnote") {
        store.setValue("pre_pro_stt_provider", currentSttProvider);
        store.setValue("pre_pro_stt_model", currentSttModel ?? "");
      }
      if (currentLlmProvider && currentLlmProvider !== "hyprnote") {
        store.setValue("pre_pro_llm_provider", currentLlmProvider);
        store.setValue("pre_pro_llm_model", currentLlmModel ?? "");
      }

      store.setValue("current_stt_provider", "hyprnote");
      store.setValue("current_stt_model", "cloud");
      store.setValue("current_llm_provider", "hyprnote");
      store.setValue("current_llm_model", "Auto");
    }

    prevIsProRef.current = isPro;
  }, [isPro, store]);
}
