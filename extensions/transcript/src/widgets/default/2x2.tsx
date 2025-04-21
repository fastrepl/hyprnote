import { FileAudioIcon, Maximize2Icon } from "lucide-react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { Button } from "@hypr/ui/components/ui/button";
import { WidgetHeader } from "@hypr/ui/components/ui/widgets";
import { WidgetTwoByTwo, WidgetTwoByTwoWrapper } from "@hypr/ui/components/ui/widgets";
import { safeNavigate } from "@hypr/utils";
import { useOngoingSession, useSessions } from "@hypr/utils/contexts";

import { LanguageSelector, Transcript, TranscriptContent } from "../../components";
import { useTranscriptWidget } from "../../hooks/useTranscriptWidget";

const Transcript2x2: WidgetTwoByTwo = ({ onMaximize, queryClient }) => {
  const sessionId = useSessions((s) => s.currentSessionId);
  const isInactive = useOngoingSession((s) => s.status === "inactive");
  const { showEmptyMessage, isEnhanced, hasTranscript } = useTranscriptWidget(sessionId);

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

  const handleOpenSession = () => {
    if (sessionId) {
      miscCommands.openAudio(sessionId);
    }
  };

  return (
    <WidgetTwoByTwoWrapper
      queryClient={queryClient}
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
            maximizeButton,
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
    </WidgetTwoByTwoWrapper>
  );
};

export default Transcript2x2;
