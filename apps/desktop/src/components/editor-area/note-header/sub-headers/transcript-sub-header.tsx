import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { CopyIcon, AudioLinesIcon, TextSearchIcon, CheckIcon } from "lucide-react";
import { writeText as writeTextToClipboard } from "@tauri-apps/plugin-clipboard-manager";

import { Button } from "@hypr/ui/components/ui/button";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { type TranscriptEditorRef } from "@hypr/tiptap/transcript";

interface TranscriptSubHeaderProps {
  sessionId: string;
  editorRef?: React.RefObject<TranscriptEditorRef | null>;
}

export function TranscriptSubHeader({ sessionId, editorRef }: TranscriptSubHeaderProps) {
  const [copied, setCopied] = useState(false);

  // Check if audio file exists for this session
  const audioExist = useQuery({
    refetchInterval: 2500,
    enabled: !!sessionId,
    queryKey: ["audio", sessionId, "exist"],
    queryFn: () => miscCommands.audioExist(sessionId),
  });

  const handleCopyAll = useCallback(async () => {
    if (editorRef?.current?.editor) {
      const text = editorRef.current.toText();
      await writeTextToClipboard(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [editorRef]);

  const handleOpenAudio = useCallback(() => {
    miscCommands.audioOpen(sessionId);
  }, [sessionId]);

  const handleSearch = useCallback(() => {
    // TODO: Implement search functionality
    console.log("Search clicked - functionality to be implemented");
  }, []);

  return (
    <div className="flex items-center justify-end px-8 py-2">
      <div className="flex items-center gap-2">
        {/* Search button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSearch}
          className="text-xs h-6 px-3 hover:bg-neutral-100"
        >
          <TextSearchIcon size={14} className="mr-1.5" />
          Search
        </Button>

        {/* Audio file button - only show if audio exists */}
        {audioExist.data && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAudio}
            className="text-xs h-6 px-3 hover:bg-neutral-100"
          >
            <AudioLinesIcon size={14} className="mr-1.5" />
            Audio
          </Button>
        )}

        {/* Copy button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyAll}
          disabled={!editorRef?.current}
          className="text-xs h-6 px-3 hover:bg-neutral-100"
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
      </div>
    </div>
  );
}
