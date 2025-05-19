import { useQuery, useQueryClient } from "@tanstack/react-query";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
  CheckIcon,
  ClipboardCopyIcon,
  ClipboardIcon,
  EarIcon,
  FileAudioIcon,
  PencilIcon,
  UploadIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as windowsCommands, events as windowsEvents } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { useOngoingSession, useSessions } from "@hypr/utils/contexts";
import { useTranscript } from "../hooks/useTranscript";
import { useTranscriptWidget } from "../hooks/useTranscriptWidget";

export function TranscriptView() {
  const queryClient = useQueryClient();
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  const sessionId = useSessions((s) => s.currentSessionId);
  const ongoingSession = useOngoingSession((s) => ({
    start: s.start,
    status: s.status,
    loading: s.loading,
    isInactive: s.status === "inactive",
  }));
  const { showEmptyMessage, hasTranscript } = useTranscriptWidget(sessionId);
  const { isLive, words } = useTranscript(sessionId);

  const handleCopyAll = () => {
    if (words && words.length > 0) {
      const transcriptText = words.map((item) => item.text).join("\n");
      writeText(transcriptText);
    }
  };

  const isOnboarding = useQuery({
    queryKey: ["onboarding"],
    queryFn: () => dbCommands.onboardingSessionId().then((v) => v === sessionId),
  });

  const audioExist = useQuery(
    {
      refetchInterval: 2500,
      enabled: !!sessionId,
      queryKey: ["audioExist", sessionId],
      queryFn: () => miscCommands.audioExist(sessionId!),
    },
    queryClient,
  );

  const editing = useQuery({
    queryKey: ["editing", sessionId],
    queryFn: () => windowsCommands.windowIsVisible({ type: "main" }).then((v) => !v),
  });

  const handleClickToggleEditing = () => {
    if (editing.data) {
      windowsCommands.windowHide({ type: "transcript", value: sessionId! }).then(() => {
        windowsCommands.windowShow({ type: "main" });
      });
    } else {
      windowsCommands.windowHide({ type: "main" }).then(() => {
        windowsCommands.windowShow({ type: "transcript", value: sessionId! });
      });
    }
  };

  const handleOpenSession = () => {
    if (sessionId) {
      miscCommands.audioOpen(sessionId);
    }
  };

  const handleStartRecording = () => {
    if (sessionId && ongoingSession.status === "inactive") {
      ongoingSession.start(sessionId);
    }
  };

  useEffect(() => {
    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        if (transcriptContainerRef.current && "scrollTop" in transcriptContainerRef.current) {
          transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
      });
    };

    if (words?.length) {
      scrollToBottom();
    }
  }, [words, isLive, transcriptContainerRef]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    windowsEvents.windowDestroyed.listen(({ payload: { window } }) => {
      if (window.type === "transcript") {
        windowsCommands.windowShow({ type: "main" });
      }
    }).then((u) => {
      unlisten = u;
    });

    return () => unlisten?.();
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-0">
        <header className="flex items-center gap-2 w-full">
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
          <div className="not-draggable flex items-center gap-2">
            {(audioExist.data && ongoingSession.isInactive && hasTranscript && sessionId) && (
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
            )}
            {(hasTranscript && sessionId) && (
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
            )}
            {hasTranscript && ongoingSession.isInactive && !isOnboarding.data && (
              <Button variant="ghost" size="icon" className="p-0" onClick={handleClickToggleEditing}>
                {editing.data
                  ? <CheckIcon size={16} className="text-black" />
                  : <PencilIcon size={16} className="text-black" />}
              </Button>
            )}
          </div>
        </header>
      </div>

      {/* Body */}
      {!sessionId ? null : (
        <div className="flex-1 overflow-hidden">
          {showEmptyMessage
            ? (
              // Empty state
              <div className="h-full flex items-center justify-center">
                <div className="text-neutral-500 font-medium text-center">
                  <div className="mb-6 text-neutral-600 flex items-center gap-1.5">
                    <Button size="sm" onClick={handleStartRecording} disabled={ongoingSession.loading}>
                      {ongoingSession.loading ? <Spinner color="black" /> : (
                        <div className="relative h-2 w-2 mr-2">
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
            )
            : (
              // Populated state
              <div
                ref={transcriptContainerRef}
                className="h-full scrollbar-none px-4 flex flex-col gap-2 overflow-y-auto text-sm py-4"
              >
                <p className="whitespace-pre-wrap">
                  {words.map((word, i) => (
                    <span key={`${word.text}-${i}`}>
                      {i > 0 ? " " : ""}
                      {word.text}
                    </span>
                  ))}
                </p>
                {isLive && (
                  <div className="flex items-center gap-2 justify-center py-2 text-neutral-400">
                    <EarIcon size={14} /> Listening... (there might be a delay)
                  </div>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
