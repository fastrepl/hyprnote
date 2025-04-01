import { Minimize2Icon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { WidgetFullSize, WidgetFullSizeWrapper } from "@hypr/ui/components/ui/widgets";
import { useSessions } from "@hypr/utils/contexts";
import { TranscriptWidget } from "../../components/transcripts";

const TranscriptFull: WidgetFullSize = ({ onMinimize }) => {
  const sessionId = useSessions((s) => s.currentSessionId);

  const minimizeButton = (
    <Button
      key="minimize"
      variant="ghost"
      size="icon"
      onClick={onMinimize}
    >
      <Minimize2Icon className="h-4 w-4 text-black" />
    </Button>
  );

  return (
    <WidgetFullSizeWrapper onMinimize={onMinimize}>
      {sessionId && (
        <TranscriptWidget
          sessionId={sessionId}
          headerAction={minimizeButton}
        />
      )}
    </WidgetFullSizeWrapper>
  );
};

export default TranscriptFull;
