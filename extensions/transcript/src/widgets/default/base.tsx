import { EarIcon, FileAudioIcon, Loader2Icon } from "lucide-react";
import React, { useEffect, useRef } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { Button } from "@hypr/ui/components/ui/button";
import { WidgetHeader } from "@hypr/ui/components/ui/widgets";
import { safeNavigate } from "@hypr/utils";
import { useOngoingSession, useSessions } from "@hypr/utils/contexts";

import { Badge } from "@hypr/ui/components/ui/badge";
import { useTranscript } from "../../hooks/useTranscript";
import { useTranscriptWidget } from "../../hooks/useTranscriptWidget";

export interface TranscriptBaseProps {
  onSizeToggle?: () => void;
  sizeToggleButton: React.ReactNode;
  WrapperComponent: React.ComponentType<any>;
  wrapperProps?: Record<string, any>;
}

export const TranscriptBase: React.FC<TranscriptBaseProps> = ({
  sizeToggleButton,
  WrapperComponent,
  wrapperProps = {},
}) => {
  const sessionId = useSessions((s) => s.currentSessionId);
  const isInactive = useOngoingSession((s) => s.status === "inactive");
  const { showEmptyMessage, isEnhanced, hasTranscript } = useTranscriptWidget(sessionId);

  const handleOpenTranscriptSettings = () => {
    const extensionId = "@hypr/extension-transcript";
    const url = `/app/settings?tab=extensions&extension=${extensionId}`;

    safeNavigate({ type: "settings" }, url);
  };

  const handleOpenSession = () => {
    if (sessionId) {
      miscCommands.openAudio(sessionId);
    }
  };

  return (
    <WrapperComponent
      {...wrapperProps}
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
            sizeToggleButton,
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
    </WrapperComponent>
  );
};

function Transcript({ sessionId }: { sessionId: string }) {
  const currentSessionId = useSessions((s) => s.currentSessionId);
  const effectiveSessionId = sessionId || currentSessionId;

  const { timeline, isLive, isLoading } = useTranscript(effectiveSessionId);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        const element = transcriptRef.current;
        if (element) {
          element.scrollTop = element.scrollHeight;
        }
      });
    };

    if (timeline?.items?.length) {
      scrollToBottom();
    }
  }, [timeline?.items, isLive]);

  const items = timeline?.items || [];

  return (
    <div
      ref={transcriptRef}
      className="flex-1 scrollbar-none px-4 flex flex-col gap-2 overflow-y-auto text-sm py-4"
    >
      {isLoading
        ? (
          <div className="flex items-center gap-2 justify-center py-2 text-neutral-400">
            <Loader2Icon size={14} className="animate-spin" /> Loading transcript...
          </div>
        )
        : (
          <>
            {items.length > 0
              && items.map((item, index) => (
                <div key={index}>
                  <p className="select-text">{item.text}</p>
                </div>
              ))}

            {isLive && (
              <div className="flex items-center gap-2 justify-center py-2 text-neutral-400">
                <EarIcon size={14} /> Listening... (there might be a delay)
              </div>
            )}
          </>
        )}
    </div>
  );
}

function TranscriptContent({ sessionId, showLiveBadge }: {
  sessionId: string;
  showLiveBadge: boolean;
}) {
  const { isLive } = useTranscript(sessionId);

  return showLiveBadge && isLive
    ? (
      <Badge
        variant="destructive"
        className="hover:bg-destructive"
      >
        LIVE
      </Badge>
    )
    : null;
}
