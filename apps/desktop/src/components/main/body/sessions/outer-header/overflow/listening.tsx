import { MicIcon, MicOffIcon } from "lucide-react";

import { DropdownMenuItem } from "@hypr/ui/components/ui/dropdown-menu";

import { useListener } from "../../../../../../contexts/listener";
import { useStartListening } from "../../../../../../hooks/useStartListening";

export function Listening({ sessionId }: { sessionId: string }) {
  const { mode, stop } = useListener((state) => ({
    mode: state.getSessionMode(sessionId),
    stop: state.stop,
  }));
  const isListening = mode === "active" || mode === "finalizing";
  const isFinalizing = mode === "finalizing";
  const isBatching = mode === "running_batch";
  const startListening = useStartListening(sessionId);

  const handleToggleListening = () => {
    if (isBatching) {
      return;
    }

    if (isListening) {
      stop();
    } else {
      startListening();
    }
  };

  return (
    <DropdownMenuItem
      className="cursor-pointer"
      onClick={handleToggleListening}
      disabled={isFinalizing || isBatching}
    >
      {isListening ? <MicOffIcon /> : <MicIcon />}
      <span>
        {isBatching
          ? "Batch processing"
          : isListening
            ? "Stop listening"
            : "Start listening"}
      </span>
    </DropdownMenuItem>
  );
}
