import { useQuery } from "@tanstack/react-query";
import { AudioLinesIcon } from "lucide-react";
import { useCallback } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { Button } from "@hypr/ui/components/ui/button";
import { useOngoingSession } from "@hypr/utils/contexts";

interface TranscriptSubHeaderProps {
  sessionId: string;
}

export function TranscriptSubHeader({ sessionId }: TranscriptSubHeaderProps) {
  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const ongoingSessionId = useOngoingSession((s) => s.sessionId);

  // Check if this session is currently recording
  const isCurrentlyRecording = ongoingSessionStatus === "running_active" && ongoingSessionId === sessionId;

  // Check if audio file exists for this session
  const audioExist = useQuery({
    refetchInterval: 2500,
    enabled: !!sessionId,
    queryKey: ["audio", sessionId, "exist"],
    queryFn: () => miscCommands.audioExist(sessionId),
  });

  const handleOpenAudio = useCallback(() => {
    miscCommands.audioOpen(sessionId);
  }, [sessionId]);

  return (
    <div className="flex items-center justify-end px-8 pt-2 pb-0.5">
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Audio file button - only show if audio exists and not currently recording */}
        {audioExist.data && !isCurrentlyRecording && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAudio}
            className="text-xs h-[28px] px-3 hover:bg-neutral-100 shadow-sm flex items-center"
          >
            <AudioLinesIcon size={14} className="mr-1.5" />
            Audio File
          </Button>
        )}
      </div>
    </div>
  );
}
