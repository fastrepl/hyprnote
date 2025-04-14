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
  LanguageSelector,
  TranscriptBody,
  TranscriptContent,
} from "../../components";
import { useTranscriptWidget } from "../../hooks/useTranscriptWidget";

const Transcript2x2: WidgetTwoByTwo = ({ onMaximize, queryClient }) => {
  const sessionId = useSessions((s) => s.currentSessionId);
  const { showEmptyMessage } = useTranscriptWidget(sessionId);

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

      <div className="flex-1">
        {sessionId && <TranscriptBody sessionId={sessionId} />}
      </div>

      {!sessionId && (
        <div className="absolute inset-0 backdrop-blur-sm bg-white/50 flex items-center justify-center z-10">
          <div className="text-neutral-500 font-medium">Session not found</div>
        </div>
      )}

      {sessionId && showEmptyMessage && (
        <div className="absolute inset-0 backdrop-blur-sm bg-white/50 flex items-center justify-center z-10 rounded-2xl">
          <div className="text-neutral-500 font-medium">
            Meeting is not active
          </div>
        </div>
      )}
    </WidgetTwoByTwoWrapper>
  );
};

export default Transcript2x2;
