import { Trans } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";

interface LocalLlmButtonProps {
  isRunning: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}

export function LocalLlmButton({
  isRunning,
  queryClient,
}: LocalLlmButtonProps) {
  const toggleLocalLlm = useMutation({
    mutationFn: async () => {
      if (!isRunning) {
        await localLlmCommands.startServer();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-llm", "running"] });
    },
  });

  return (
    <>
      {isRunning ? (
        <div className="flex items-center gap-1.5">
          <div className="relative h-2 w-2">
            <div className="absolute inset-0 rounded-full bg-green-500/30"></div>
            <div className="absolute inset-0 rounded-full bg-green-500 animate-ping"></div>
          </div>
          <span className="text-xs text-green-600">
            <Trans>Active</Trans>
          </span>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleLocalLlm.mutate()}
          disabled={toggleLocalLlm.isPending}
          className="min-w-20 text-center"
        >
          {toggleLocalLlm.isPending ? (
            <>
              <Spinner />
              <Trans>Loading...</Trans>
            </>
          ) : (
            <Trans>Start Server</Trans>
          )}
        </Button>
      )}
    </>
  );
}
