import { platform } from "@tauri-apps/plugin-os";
import { useEffect, useRef } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";

import { useAuth } from "../auth";
import { useBillingAccess } from "../billing";
import { useConfigValues } from "../config/use-config";
import { commands } from "../types/tauri.gen";

export function usePersonProperties() {
  const auth = useAuth();
  const { isPro } = useBillingAccess();
  const hasSetInitialProperties = useRef(false);

  const configValues = useConfigValues([
    "telemetry_consent",
    "current_stt_provider",
    "current_llm_provider",
    "ai_language",
  ] as const);

  useEffect(() => {
    const setInitialProperties = async () => {
      if (hasSetInitialProperties.current) {
        return;
      }
      hasSetInitialProperties.current = true;

      const isLocalMode = await commands
        .getOnboardingLocal()
        .then((result) => result.status === "ok" && result.data);

      await analyticsCommands.setProperties({
        set_once: {
          initial_platform: platform(),
        },
        set: {
          platform: platform(),
          is_local_mode: isLocalMode,
        },
      });
    };

    void setInitialProperties();
  }, []);

  useEffect(() => {
    const isSignedUp = !!auth?.session;

    void analyticsCommands.setProperties({
      set: {
        is_signed_up: isSignedUp,
        plan: isPro ? "pro" : "free",
      },
    });
  }, [auth?.session, isPro]);

  useEffect(() => {
    void analyticsCommands.setProperties({
      set: {
        telemetry_opt_out: configValues.telemetry_consent === false,
        stt_provider: configValues.current_stt_provider ?? null,
        llm_provider: configValues.current_llm_provider ?? null,
        ai_language: configValues.ai_language ?? null,
      },
    });
  }, [
    configValues.telemetry_consent,
    configValues.current_stt_provider,
    configValues.current_llm_provider,
    configValues.ai_language,
  ]);
}
