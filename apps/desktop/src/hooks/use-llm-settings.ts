import { useMutation, useQuery } from "@tanstack/react-query";

import { commands as connectorCommands } from "@hypr/plugin-connector";

export function useLlmSettings() {
  const hyprCloudEnabled = useQuery({
    queryKey: ["hypr-cloud-enabled"],
    queryFn: () => connectorCommands.getHyprcloudEnabled(),
  });

  const setHyprCloudEnabledMutation = useMutation({
    mutationFn: (enabled: boolean) => connectorCommands.setHyprcloudEnabled(enabled),
    onSuccess: () => {
      hyprCloudEnabled.refetch();
    },
  });

  const customLLMEnabled = useQuery({
    queryKey: ["custom-llm-enabled"],
    queryFn: () => connectorCommands.getCustomLlmEnabled(),
  });

  const setCustomLLMEnabledMutation = useMutation({
    mutationFn: (enabled: boolean) => connectorCommands.setCustomLlmEnabled(enabled),
    onSuccess: () => {
      customLLMEnabled.refetch();
    },
  });

  return {
    hyprCloudEnabled,
    setHyprCloudEnabledMutation,
    customLLMEnabled,
    setCustomLLMEnabledMutation,
  };
}