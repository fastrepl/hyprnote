import { FileAudioIcon, Minimize2Icon } from "lucide-react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { Button } from "@hypr/ui/components/ui/button";
import { WidgetHeader } from "@hypr/ui/components/ui/widgets";
import { WidgetFullSize, WidgetFullSizeWrapper } from "@hypr/ui/components/ui/widgets";
import { safeNavigate } from "@hypr/utils";
import { useOngoingSession, useSessions } from "@hypr/utils/contexts";

import { LanguageSelector, Transcript, TranscriptContent } from "../../components";
import { useTranscriptWidget } from "../../hooks/useTranscriptWidget";

const TranscriptFull: WidgetFullSize = ({ onMinimize }) => {
  const sessionId = useSessions((s) => s.currentSessionId);
  const isInactive = useOngoingSession((s) => s.status === "inactive");
  const { showEmptyMessage, isEnhanced, hasTranscript } = useTranscriptWidget(sessionId);

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

  const handleOpenSession = () => {
    if (sessionId) {
      miscCommands.openAudio(sessionId);
    }
  };

  return (
    <WidgetFullSizeWrapper
      onMinimize={onMinimize}
      className="relative w-full h-full"
    >
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
            (isInactive && hasTranscript && sessionId) && (
              <Button variant="ghost" size="icon" className="p-0" onClick={handleOpenSession}>
                <FileAudioIcon size={16} className="text-black" />
              </Button>
            ),
            sessionId && <LanguageSelector key="language" sessionId={sessionId} />,
            minimizeButton,
          ].filter(Boolean)}
        />
      </div>

      {sessionId && <Transcript sessionId={sessionId} />}

      {!sessionId && (
        <div className="absolute inset-0 backdrop-blur-sm bg-white/50 flex items-center justify-center z-10">
          <div className="text-neutral-500 font-medium">Session not found</div>
        </div>
      )}

      {sessionId && showEmptyMessage && (
        <div className="absolute inset-0 backdrop-blur-sm bg-white/50 flex items-center justify-center z-10 rounded-2xl">
          <div className="text-neutral-500 font-medium">
            {isEnhanced
              ? "No transcript available"
              : "Meeting is not active"}
          </div>
        </div>
      )}
    </WidgetFullSizeWrapper>
  );
};

export default TranscriptFull;
