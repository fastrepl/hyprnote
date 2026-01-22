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
      const preLogoutSttProvider = store.getValue("pre_logout_stt_provider");
      const preLogoutSttModel = store.getValue("pre_logout_stt_model");
      const preLogoutLlmProvider = store.getValue("pre_logout_llm_provider");
      const preLogoutLlmModel = store.getValue("pre_logout_llm_model");

      const hasSavedSttConfig = !!preLogoutSttProvider;
      const hasSavedLlmConfig = !!preLogoutLlmProvider;

      if (hasSavedSttConfig) {
        store.setValue("current_stt_provider", preLogoutSttProvider);
        store.setValue("current_stt_model", preLogoutSttModel ?? "");
      } else {
        store.setValue("current_stt_provider", "hyprnote");
        store.setValue("current_stt_model", "cloud");
      }

      if (hasSavedLlmConfig) {
        store.setValue("current_llm_provider", preLogoutLlmProvider);
        store.setValue("current_llm_model", preLogoutLlmModel ?? "");
      } else {
        store.setValue("current_llm_provider", "hyprnote");
        store.setValue("current_llm_model", "Auto");
      }

      store.setValue("pre_logout_stt_provider", "");
      store.setValue("pre_logout_stt_model", "");
      store.setValue("pre_logout_llm_provider", "");
      store.setValue("pre_logout_llm_model", "");
    }

    prevIsProRef.current = isPro;
  }, [isPro, store]);
}
