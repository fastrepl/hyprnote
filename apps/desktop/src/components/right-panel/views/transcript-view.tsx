import { useQuery, useQueryClient } from "@tanstack/react-query";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { AudioLinesIcon, ClipboardIcon, Copy, UploadIcon } from "lucide-react";
import { useRef } from "react";

import { SpeakerSelector } from "@/components/right-panel/views/exp";
import { commands as dbCommands, type Word } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import TranscriptEditor, { type TranscriptEditorRef } from "@hypr/tiptap/transcript";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { useOngoingSession, useSessions } from "@hypr/utils/contexts";
import { useTranscript } from "../hooks/useTranscript";
import { useTranscriptWidget } from "../hooks/useTranscriptWidget";

export function TranscriptView() {
  const queryClient = useQueryClient();

  const sessionId = useSessions((s) => s.currentSessionId);
  const ongoingSession = useOngoingSession((s) => ({
    start: s.start,
    status: s.status,
    loading: s.loading,
    isInactive: s.status === "inactive",
  }));
  const { showEmptyMessage, hasTranscript } = useTranscriptWidget(sessionId);
  const { isLive, words } = useTranscript(sessionId);

  const editorRef = useRef<TranscriptEditorRef | null>(null);

  const handleCopyAll = () => {
    if (words && words.length > 0) {
      const transcriptText = words.map((word) => word.text).join(" ");
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
    queryClient,
  );

  const handleOpenSession = () => {
    if (sessionId) {
      miscCommands.audioOpen(sessionId);
    }
  };

  const handleUpdate = (words: Word[]) => {
    dbCommands.getSession({ id: sessionId! }).then((session) => {
      if (session) {
        console.log("upserting session", words);
        dbCommands.upsertSession({ ...session, words });
      }
    });
  };

  if (!sessionId) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 pb-0">
        <header className="flex items-center gap-2 w-full">
          {!showEmptyMessage && (
            <div className="flex-1 text-md font-medium">
              <div className="flex text-md items-center gap-2">
                Transcript
                {isLive
                  && (
                    <div className="relative h-2 w-2">
                      <div className="absolute inset-0 rounded-full bg-red-500/30"></div>
                      <div className="absolute inset-0 rounded-full bg-red-500 animate-ping"></div>
                    </div>
                  )}
              </div>
            </div>
          )}
          <div className="not-draggable flex items-center gap-2">
            {(audioExist.data && ongoingSession.isInactive && hasTranscript && sessionId) && (
              <TooltipProvider key="listen-recording-tooltip">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="p-0" onClick={handleOpenSession}>
                      <AudioLinesIcon size={16} className="text-black" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Listen to recording</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {(hasTranscript && sessionId) && (
              <TooltipProvider key="copy-all-tooltip">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="p-0" onClick={handleCopyAll}>
                      <Copy size={16} className="text-black" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Copy transcript</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </header>
      </div>

      <div className="flex-1 overflow-hidden">
        {showEmptyMessage
          ? <RenderEmpty sessionId={sessionId} />
          : (
            <div className="px-4 h-full">
              <TranscriptEditor
                ref={editorRef}
                initialWords={words}
                editable={ongoingSession.isInactive}
                onUpdate={handleUpdate}
                c={SpeakerSelector}
              />
            </div>
          )}
      </div>
    </div>
  );
}

function RenderEmpty({ sessionId }: { sessionId: string }) {
  const ongoingSession = useOngoingSession((s) => ({
    start: s.start,
    status: s.status,
    loading: s.loading,
  }));

  const handleStartRecording = () => {
    if (ongoingSession.status === "inactive") {
      ongoingSession.start(sessionId);
    }
  };

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-neutral-500 font-medium text-center">
        <div className="mb-6 text-neutral-600 flex items-center gap-1.5">
          <Button size="sm" onClick={handleStartRecording} disabled={ongoingSession.loading}>
            {ongoingSession.loading ? <Spinner color="black" /> : (
              <div className="relative h-2 w-2">
                <div className="absolute inset-0 rounded-full bg-red-500"></div>
                <div className="absolute inset-0 rounded-full bg-red-400 animate-ping"></div>
              </div>
            )}
            {ongoingSession.loading ? "Starting..." : "Start recording"}
          </Button>
          <span className="text-sm">to see live transcript</span>
        </div>

        <div className="flex items-center justify-center w-full max-w-[240px] mb-4">
          <div className="h-px bg-neutral-200 flex-grow"></div>
          <span className="px-3 text-xs text-neutral-400 font-medium">or</span>
          <div className="h-px bg-neutral-200 flex-grow"></div>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" className="hover:bg-neutral-100" disabled>
            <UploadIcon size={14} />Upload recording{" "}
            <span className="text-xs text-neutral-400 italic">coming soon</span>
          </Button>
          <Button variant="outline" size="sm" className="hover:bg-neutral-100" disabled>
            <ClipboardIcon size={14} />Paste transcript{" "}
            <span className="text-xs text-neutral-400 italic">coming soon</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
