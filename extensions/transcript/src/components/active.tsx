import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { WidgetHeader } from "@hypr/ui/components/ui/widgets";
import { EarIcon, FileAudioIcon, Loader2Icon } from "lucide-react";
import React, { useEffect, useRef } from "react";

interface TranscriptItemProps {
  text: string;
}

interface TranscriptTimelineProps {
  items: TranscriptItemProps[];
}

interface TranscriptContentProps {
  isLive: boolean;
  showLiveBadge: boolean;
}

interface TranscriptProps {
  timeline?: TranscriptTimelineProps;
  isLive: boolean;
  isLoading: boolean;
}

interface ActiveProps {
  sessionId: string;
  hasTranscript: boolean;
  isInactive: boolean;
  sizeToggleButton: React.ReactNode;
  WrapperComponent: React.ComponentType<any>;
  wrapperProps?: Record<string, any>;
  onOpenTranscriptSettings: () => void;
  onOpenSession: () => void;
  transcriptProps: TranscriptProps;
  isLive: boolean;
}

export const TranscriptContent: React.FC<TranscriptContentProps> = ({
  isLive,
  showLiveBadge,
}) => {
  return showLiveBadge && isLive
    ? (
      <Badge variant="destructive" className="hover:bg-destructive">
        LIVE
      </Badge>
    )
    : null;
};

export const Transcript: React.FC<TranscriptProps> = ({
  timeline,
  isLive,
  isLoading,
}) => {
  const items = timeline?.items || [];
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

    if (items.length) {
      scrollToBottom();
    }
  }, [items, isLive]);

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
};

export default function Active({
  sessionId,
  hasTranscript,
  isInactive,
  sizeToggleButton,
  WrapperComponent,
  wrapperProps = {},
  onOpenTranscriptSettings,
  onOpenSession,
  transcriptProps,
  isLive,
}: ActiveProps) {
  return (
    <WrapperComponent {...wrapperProps} className="relative w-full h-full">
      <div className="p-4 pb-0">
        <WidgetHeader
          title={
            <div className="flex items-center gap-2">
              <button onClick={onOpenTranscriptSettings}>
                <img
                  src="/assets/transcript-icon.jpg"
                  className="size-5 rounded-md cursor-pointer"
                  title="Configure Transcript extension"
                />
              </button>
              Transcript
              {sessionId && (
                <TranscriptContent
                  isLive={isLive}
                  showLiveBadge={true}
                />
              )}
            </div>
          }
          actions={[
            isInactive && hasTranscript && sessionId && (
              <Button
                variant="ghost"
                size="icon"
                className="p-0"
                onClick={onOpenSession}
              >
                <FileAudioIcon size={16} className="text-black" />
              </Button>
            ),
            sizeToggleButton,
          ].filter(Boolean)}
        />
      </div>

      {sessionId && <Transcript {...transcriptProps} />}
    </WrapperComponent>
  );
}
