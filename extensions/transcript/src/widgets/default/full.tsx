import { Minimize2Icon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { WidgetHeader } from "@hypr/ui/components/ui/widgets";
import { WidgetFullSize, WidgetFullSizeWrapper } from "@hypr/ui/components/ui/widgets";
import { safeNavigate } from "@hypr/utils";
import { useSessions } from "@hypr/utils/contexts";

import { LanguageSelector, TranscriptBody, TranscriptContent } from "../../components";

const TranscriptFull: WidgetFullSize = ({ onMinimize }) => {
  const sessionId = useSessions((s) => s.currentSessionId);

  const handleOpenTranscriptSettings = () => {
    const extensionId = "@hypr/extension-transcript";
    const url = `/app/settings?tab=extensions&extension=${extensionId}`;

    safeNavigate({ type: "settings" }, url);
  };

  const minimizeButton = (
    <Button key="minimize" variant="ghost" size="icon" onClick={onMinimize}>
      <Minimize2Icon className="h-4 w-4 text-black" />
    </Button>
  );

  return (
    <WidgetFullSizeWrapper onMinimize={onMinimize}>
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
              {sessionId && <TranscriptContent sessionId={sessionId} showLiveBadge={true} />}
            </div>
          }
          actions={[
            sessionId && <LanguageSelector key="language" sessionId={sessionId} />,
            minimizeButton,
          ].filter(Boolean)}
        />
      </div>

      {sessionId
        ? <TranscriptBody sessionId={sessionId} />
        : (
          <div className="flex items-center justify-center h-full text-neutral-400 p-4">
            Session not found
          </div>
        )}
    </WidgetFullSizeWrapper>
  );
};

export default TranscriptFull;
