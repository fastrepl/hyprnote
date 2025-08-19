import { useEffect, useRef } from "react";

import { useLicense } from "@/hooks/use-license";
import { useLlmSettings } from "@/hooks/use-llm-settings";
import { useQuery } from "@tanstack/react-query";
import { commands as localLlmCommands } from "@hypr/plugin-local-llm";

const REFRESH_INTERVAL = 30 * 60 * 1000;
const INITIAL_DELAY = 5000;
const RATE_LIMIT = 60 * 60 * 1000;

export function LicenseRefreshProvider({ children }: { children: React.ReactNode }) {
  const { getLicenseStatus, refreshLicense, getLicense } = useLicense();
  const { hyprCloudEnabled, setHyprCloudEnabledMutation, setCustomLLMEnabledMutation } = useLlmSettings();
  const lastRefreshAttempt = useRef<number>(0);

  // Auto-disable HyprCloud when license expires
  useEffect(() => {
    const isPro = !!getLicense.data?.valid;
    
    if (!isPro && hyprCloudEnabled.data) {
      setHyprCloudEnabledMutation.mutate(false);
      setCustomLLMEnabledMutation.mutate(false);
      
    }
  }, [getLicense.data?.valid, hyprCloudEnabled.data, setHyprCloudEnabledMutation, setCustomLLMEnabledMutation]);

  useEffect(() => {
    if (getLicense.isLoading) {
      return;
    }

    const attemptRefresh = () => {
      const status = getLicenseStatus();
      const now = Date.now();

      if (refreshLicense.isPending || now - lastRefreshAttempt.current < RATE_LIMIT) {
        return;
      }

      if (!status.isValid || status.needsRefresh) {
        lastRefreshAttempt.current = now;
        refreshLicense.mutate();
      }
    };

    const timeout = setTimeout(attemptRefresh, INITIAL_DELAY);
    const interval = setInterval(attemptRefresh, REFRESH_INTERVAL);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [getLicense.isLoading, getLicenseStatus, refreshLicense.isPending]);

  return <>{children}</>;
}
