import { usePrevious } from "@uidotdev/usehooks";
import { useCallback, useState } from "react";

import { useListener } from "../../contexts/listener";

export function useListenerStopTrigger(sessionId: string): {
  justStopped: boolean;
  reset: () => void;
} {
  const listenerStatus = useListener((state) => state.live.status);
  const prevListenerStatus = usePrevious(listenerStatus);
  const liveSessionId = useListener((state) => state.live.sessionId);
  const prevLiveSessionId = usePrevious(liveSessionId);

  const [consumed, setConsumed] = useState(false);

  const listenerJustBecameInactive =
    (prevListenerStatus === "active" || prevListenerStatus === "finalizing") &&
    listenerStatus === "inactive";
  const wasThisSessionListening = prevLiveSessionId === sessionId;

  const justStopped =
    listenerJustBecameInactive && wasThisSessionListening && !consumed;

  const reset = useCallback(() => {
    setConsumed(true);
    setTimeout(() => setConsumed(false), 100);
  }, []);

  return { justStopped, reset };
}
