import { Maximize2Icon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { WidgetHeader } from "@hypr/ui/components/ui/widgets";
import {
  WidgetTwoByTwo,
  WidgetTwoByTwoWrapper,
} from "@hypr/ui/components/ui/widgets";
import { safeNavigate } from "@hypr/utils";
import { useSessions } from "@hypr/utils/contexts";

import {
  TranscriptContent,
  LanguageSelector,
  TranscriptBody,
} from "../../components";

const Transcript2x2: WidgetTwoByTwo = ({ onMaximize }) => {
  const sessionId = useSessions((s) => s.currentSessionId);

  const handleOpenTranscriptSettings = () => {
    const extensionId = "@hypr/extension-transcript";
    const url = `/app/settings?tab=extensions&extension=${extensionId}`;

    safeNavigate({ type: "settings" }, url);
  };

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

  return (
    <WidgetTwoByTwoWrapper>
      <div className="p-4 pb-0">
        <WidgetHeader
          title={
            <div className="flex items-center gap-2">
              <button onClick={handleOpenTranscriptSettings}>
                <img
                  src="/assets/transcript-icon.jpg"
                  className="size-5 rounded-md cursor-pointer"
                  title="Configure Transcript extension"
                />
              </button>
              Transcript
              {sessionId && (
                <TranscriptContent sessionId={sessionId} showLiveBadge={true} />
              )}
            </div>
          }
          actions={[
            sessionId && (
              <LanguageSelector key="language" sessionId={sessionId} />
            ),
            maximizeButton,
          ].filter(Boolean)}
        />
      </div>

      {sessionId ? (
        <TranscriptBody sessionId={sessionId} />
      ) : (
        <div className="flex items-center justify-center h-full text-neutral-400 p-4">
          Session not found
        </div>
      )}
    </WidgetTwoByTwoWrapper>
  );
};

export default Transcript2x2;
