import { Minimize2Icon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { WidgetFullSize, WidgetFullSizeWrapper } from "@hypr/ui/components/ui/widgets";
import { useSessions } from "@hypr/utils/contexts";
import { TranscriptWidget } from "../../components/transcripts";
import MockProvider from "./mock";

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

  if (!sessionId) {
    const id = crypto.randomUUID();
    return (
      <MockProvider sessionId={id}>
        <WidgetFullSizeWrapper onMinimize={onMinimize}>
          <TranscriptWidget sessionId={id} headerAction={minimizeButton} />
        </WidgetFullSizeWrapper>
      </MockProvider>
    );
  }

  return (
    <WidgetFullSizeWrapper onMinimize={onMinimize}>
      <TranscriptWidget
        sessionId={sessionId}
        headerAction={minimizeButton}
      />
    </WidgetFullSizeWrapper>
  );
};

export default TranscriptFull;
