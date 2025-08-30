import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { AudioLinesIcon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { type TranscriptEditorRef } from "@hypr/tiptap/transcript";
import { EventChip } from "../chips/event-chip";
import { ParticipantsChip } from "../chips/participants-chip";

interface TranscriptSubHeaderProps {
  sessionId: string;
  editorRef?: React.RefObject<TranscriptEditorRef | null>;
}

export function TranscriptSubHeader({ sessionId, editorRef }: TranscriptSubHeaderProps) {
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

  // Removed handleSearch function as it's no longer needed

  return (
    <div className="px-8 py-3">
      {/* Full-width rounded box containing chips and buttons */}
      <div className="flex items-start justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-lg w-full">
        {/*
        <div className="flex flex-col gap-2">
          <EventChip sessionId={sessionId} />
          <ParticipantsChip sessionId={sessionId} />
        </div>
        */}

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2">
        {/* Audio file button - only show if audio exists */}
        {audioExist.data && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAudio}
            className="text-xs h-8 px-3 hover:bg-neutral-100"
          >
            <AudioLinesIcon size={14} className="mr-1.5" />
            Audio
          </Button>
        )}

        {/* Copy button */}
        {/*
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyAll}
          disabled={!editorRef?.current}
          className="text-xs h-8 px-3 hover:bg-neutral-100"
        >
          {copied ? (
            <>
              <CheckIcon size={14} className="mr-1.5 text-neutral-800" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon size={14} className="mr-1.5" />
              Copy
            </>
          )}
        </Button>
        */}
        </div>
      </div>
    </div>
  );
}
