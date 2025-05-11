import { useQuery } from "@tanstack/react-query";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { CheckIcon, ClipboardCopyIcon, FileAudioIcon, PencilIcon } from "lucide-react";
import React, { useState } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { useOngoingSession, useSessions } from "@hypr/utils/contexts";
import { Transcript, TranscriptContent } from "./transcript";
import { WidgetHeader } from "./ui";
import { useTranscript } from "./useTranscript";
import { useTranscriptWidget } from "./useTranscriptWidget";

export interface TranscriptBaseProps {
  WrapperComponent: React.ComponentType<any>;
  wrapperProps?: Partial<any>;
}

export const TranscriptBase: React.FC<TranscriptBaseProps> = ({
  WrapperComponent,
  wrapperProps = {},
}) => {
  const sessionId = useSessions((s) => s.currentSessionId);
  const isInactive = useOngoingSession((s) => s.status === "inactive");
  const { showEmptyMessage, isEnhanced, hasTranscript } = useTranscriptWidget(sessionId);
  const { timeline } = useTranscript(sessionId);

  const [editing, setEditing] = useState(false);

  const handleCopyAll = () => {
    if (timeline && timeline.items && timeline.items.length > 0) {
      const transcriptText = timeline.items.map((item) => item.text).join("\n");
      writeText(transcriptText);
    }
  };

  const audioExist = useQuery(
    {
      refetchInterval: 2500,
      enabled: !!sessionId,
      queryKey: ["audioExist", sessionId],
      queryFn: () => miscCommands.audioExist(sessionId!),
    },
    wrapperProps.queryClient,
  );

  const handleOpenSession = () => {
    if (sessionId) {
      miscCommands.audioOpen(sessionId);
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
            <div className="flex text-md items-center gap-2">
              Transcript
              {sessionId && <TranscriptContent sessionId={sessionId} showLiveBadge={true} />}
            </div>
          }
          actions={[
            (audioExist.data && isInactive && hasTranscript && sessionId) && (
              <TooltipProvider key="listen-recording-tooltip">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="p-0" onClick={handleOpenSession}>
                      <FileAudioIcon size={16} className="text-black" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Listen to recording</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ),
            (hasTranscript && sessionId) && (
              <TooltipProvider key="copy-all-tooltip">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="p-0" onClick={handleCopyAll}>
                      <ClipboardCopyIcon size={16} className="text-black" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Copy transcript</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ),
            <Button variant="ghost" size="icon" className="p-0" onClick={() => setEditing(!editing)}>
              {editing
                ? <CheckIcon size={16} className="text-black" />
                : <PencilIcon size={16} className="text-black" />}
            </Button>,
          ].filter(Boolean)}
        />
      </div>

      {sessionId && <Transcript sessionId={sessionId} editing={editing} />}

      {!sessionId && (
        <div className="absolute inset-0 backdrop-blur-sm bg-white/50 flex items-center justify-center">
          <div className="text-neutral-500 font-medium">Session not found</div>
        </div>
      )}

      {sessionId && showEmptyMessage && (
        <div className="absolute inset-0 backdrop-blur-sm bg-white/50 flex items-center justify-center rounded-2xl">
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
