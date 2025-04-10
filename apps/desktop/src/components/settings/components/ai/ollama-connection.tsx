import { Trans } from "@lingui/react/macro";
import { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { Server } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Spinner } from "@hypr/ui/components/ui/spinner";

interface OllamaConnectionProps {
  ollamaUrl: string;
  setOllamaUrl: Dispatch<SetStateAction<string>>;
  ollamaStatus: UseQueryResult<boolean, unknown>;
  isConnecting: boolean;
  connectToOllama: UseMutationResult<boolean, Error, void, unknown>;
}

export function OllamaConnection({
  ollamaUrl,
  setOllamaUrl,
  ollamaStatus,
  isConnecting,
  connectToOllama,
}: OllamaConnectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4" />
          <h4 className="text-sm font-medium">
            <Trans>Ollama Connection</Trans>
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          {ollamaStatus.data
            ? (
              <div className="flex items-center gap-1.5">
                <div className="relative h-2 w-2">
                  <div className="absolute inset-0 rounded-full bg-green-500/30"></div>
                  <div className="absolute inset-0 rounded-full bg-green-500 animate-ping"></div>
                </div>
                <span className="text-xs text-green-600">
                  <Trans>Connected</Trans>
                </span>
              </div>
            )
            : (
              <span className="text-xs text-muted-foreground">
                <Trans>Not connected</Trans>
              </span>
            )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={ollamaUrl}
          onChange={(e) => setOllamaUrl(e.target.value)}
          placeholder="http://localhost:11434"
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => connectToOllama.mutate()}
          disabled={isConnecting || ollamaStatus.isLoading}
        >
          {isConnecting
            ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                <Trans>Connecting...</Trans>
              </>
            )
            : <Trans>Connect</Trans>}
        </Button>
      </div>
    </div>
  );
}
