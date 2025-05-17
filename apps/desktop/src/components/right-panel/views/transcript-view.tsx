import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { ClipboardCopyIcon, EarIcon, FileAudioIcon, Loader2Icon } from "lucide-react";
import { useEffect, useRef } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as windowsCommands, events as windowsEvents } from "@hypr/plugin-windows";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { useOngoingSession, useSessions } from "@hypr/utils/contexts";
import { CheckIcon, PencilIcon } from "lucide-react";
import { useTranscript } from "../hooks/useTranscript";
import { useTranscriptWidget } from "../hooks/useTranscriptWidget";

interface CustomHeaderProps {
  leading?: React.ReactNode;
  title?: React.ReactNode;
  actions?: React.ReactNode[];
}

const CustomHeader: React.FC<CustomHeaderProps> = ({ leading, title, actions }) => {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
      {leading && <div>{leading}</div>}
      {title && (
        <div style={{ flex: 1, fontSize: "18px", fontWeight: 600 }}>
          {title}
        </div>
      )}
      {actions && (
        <div
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
          className="not-draggable"
        >
          {actions.filter(Boolean)} {/* Ensure actions are filtered like before if they might contain falsy values */}
        </div>
      )}
    </header>
  );
};

export function TranscriptView() {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const queryClient = useQueryClient();
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  if (!noteMatch) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-neutral-500">
          Widgets are only available in note view.
        </div>
      </div>
    );
  }

  const sessionId = useSessions((s) => s.currentSessionId);
  const isInactive = useOngoingSession((s) => s.status === "inactive");
  const { showEmptyMessage, isEnhanced, hasTranscript } = useTranscriptWidget(sessionId);
  const { isLive, words, isLoading } = useTranscript(sessionId);

  const handleCopyAll = () => {
    if (words && words.length > 0) {
      const transcriptText = words.map((item) => item.text).join("\n");
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
    <div className="relative w-full h-full flex flex-col">
      <div className="p-4 pb-0">
        <CustomHeader
          title={
            <div className="flex text-md items-center gap-2">
              Transcript
              {isLive
                && (
                  <Badge
                    variant="destructive"
                    className="hover:bg-destructive"
                  >
                    LIVE
                  </Badge>
                )}
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
            <Button variant="ghost" size="icon" className="p-0" onClick={handleClickToggleEditing}>
              {editing.data
                ? <CheckIcon size={16} className="text-black" />
                : <PencilIcon size={16} className="text-black" />}
            </Button>,
          ]}
        />
      </div>

      {sessionId && (
        <div
          ref={transcriptContainerRef}
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
              </>
            )}
        </div>
      )}

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
    </div>
  );
}
