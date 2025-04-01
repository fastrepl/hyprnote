import { Maximize2Icon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { WidgetTwoByTwo, WidgetTwoByTwoWrapper } from "@hypr/ui/components/ui/widgets";
import { useSessions } from "@hypr/utils/contexts";
import { TranscriptWidget } from "../../components/transcripts";
import MockProvider from "./mock";

const Transcript2x2: WidgetTwoByTwo = ({ onMaximize }) => {
  const sessionId = useSessions((s) => s.currentSessionId);

  const maximizeButton = (
    <Button
      key="maximize"
      variant="ghost"
      size="icon"
      onClick={onMaximize}
      className="p-0"
    >
      <Maximize2Icon size={16} className="text-neutral-900" />
    </Button>
  );

  if (!sessionId) {
    const id = crypto.randomUUID();

    return (
      <MockProvider sessionId={id}>
        <WidgetTwoByTwoWrapper>
          <TranscriptWidget sessionId={id} headerAction={maximizeButton} />
        </WidgetTwoByTwoWrapper>
      </MockProvider>
    );
  }

  return (
    <WidgetTwoByTwoWrapper>
      <TranscriptWidget
        sessionId={sessionId}
        headerAction={maximizeButton}
      />
    </WidgetTwoByTwoWrapper>
  );
};

export default Transcript2x2;
