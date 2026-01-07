import { useQueryClient } from "@tanstack/react-query";
import { downloadDir } from "@tauri-apps/api/path";
import { open as selectFile } from "@tauri-apps/plugin-dialog";
import { Effect, pipe } from "effect";
import {
  EllipsisVerticalIcon,
  FileTextIcon,
  LoaderIcon,
  UploadCloudIcon,
} from "lucide-react";
import { useCallback, useState } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import { commands as listener2Commands } from "@hypr/plugin-listener2";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { useListener } from "../../../../../contexts/listener";
import { fromResult } from "../../../../../effect";
import { useRunBatch } from "../../../../../hooks/useRunBatch";
import * as main from "../../../../../store/tinybase/store/main";
import { type Tab, useTabs } from "../../../../../store/zustand/tabs";
import { ChannelProfile } from "../../../../../utils/segment";
import { ActionableTooltipContent } from "./shared";

type FileSelection = string | string[] | null;

export function OptionsMenu({
  sessionId,
  disabled,
  warningMessage,
  onConfigure,
}: {
  sessionId: string;
  disabled: boolean;
  warningMessage: string;
  onConfigure?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const runBatch = useRunBatch(sessionId);
  const queryClient = useQueryClient();
  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const isBatchProcessing = sessionMode === "running_batch";

  const store = main.UI.useStore(main.STORE_ID);
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const updateSessionTabState = useTabs((state) => state.updateSessionTabState);
  const sessionTab = useTabs((state) => {
    const found = state.tabs.find(
      (tab): tab is Extract<Tab, { type: "sessions" }> =>
        tab.type === "sessions" && tab.id === sessionId,
    );
    return found ?? null;
  });

  const handleFilePath = useCallback(
    (selection: FileSelection, kind: "audio" | "transcript") => {
      if (!selection) {
        return Effect.void;
      }

      const path = Array.isArray(selection) ? selection[0] : selection;

      if (!path) {
        return Effect.void;
      }

      const normalizedPath = path.toLowerCase();

      if (kind === "transcript") {
        if (
          !normalizedPath.endsWith(".vtt") &&
          !normalizedPath.endsWith(".srt")
        ) {
          return Effect.void;
        }

        return pipe(
          fromResult(listener2Commands.parseSubtitle(path)),
          Effect.tap((subtitle) =>
            Effect.sync(() => {
              if (!store || subtitle.tokens.length === 0) {
                return;
              }

              if (sessionTab) {
                updateSessionTabState(sessionTab, {
                  ...sessionTab.state,
                  view: { type: "transcript" },
                });
              }

              const transcriptId = crypto.randomUUID();
              const createdAt = new Date().toISOString();

              const words = subtitle.tokens.map((token) => ({
                id: crypto.randomUUID(),
                transcript_id: transcriptId,
                text: token.text,
                start_ms: token.start_time,
                end_ms: token.end_time,
                channel: ChannelProfile.MixedCapture,
                user_id: user_id ?? "",
                created_at: new Date().toISOString(),
              }));

              store.setRow("transcripts", transcriptId, {
                session_id: sessionId,
                user_id: user_id ?? "",
                created_at: createdAt,
                started_at: Date.now(),
                words: JSON.stringify(words),
                speaker_hints: "[]",
              });

              void analyticsCommands.event({
                event: "file_uploaded",
                file_type: "transcript",
                token_count: subtitle.tokens.length,
              });
            }),
          ),
        );
      }

      if (
        !normalizedPath.endsWith(".wav") &&
        !normalizedPath.endsWith(".mp3") &&
        !normalizedPath.endsWith(".ogg") &&
        !normalizedPath.endsWith(".m4a") &&
        !normalizedPath.endsWith(".flac")
      ) {
        return Effect.void;
      }

      return pipe(
        fromResult(fsSyncCommands.audioImport(sessionId, path)),
        Effect.tap(() =>
          Effect.sync(() => {
            void analyticsCommands.event({
              event: "file_uploaded",
              file_type: "audio",
            });
            void queryClient.invalidateQueries({
              queryKey: ["audio", sessionId, "exist"],
            });
            void queryClient.invalidateQueries({
              queryKey: ["audio", sessionId, "url"],
            });
          }),
        ),
        Effect.flatMap(() => Effect.promise(() => runBatch(path))),
      );
    },
    [
      queryClient,
      runBatch,
      sessionId,
      sessionTab,
      store,
      updateSessionTabState,
      user_id,
    ],
  );

  const selectAndHandleFile = useCallback(
    (
      options: {
        title: string;
        filters: { name: string; extensions: string[] }[];
      },
      kind: "audio" | "transcript",
    ) => {
      if (disabled) {
        return;
      }

      setOpen(false);

      const program = pipe(
        Effect.promise(() => downloadDir()),
        Effect.flatMap((defaultPath) =>
          Effect.promise(() =>
            selectFile({
              title: options.title,
              multiple: false,
              directory: false,
              defaultPath,
              filters: options.filters,
            }),
          ),
        ),
        Effect.tap((selection) =>
          Effect.sync(() => {
            if (selection && kind === "audio") {
              setIsUploading(true);
            }
          }),
        ),
        Effect.flatMap((selection) => handleFilePath(selection, kind)),
      );

      Effect.runPromise(program)
        .catch((error) => {
          console.error("[batch] failed:", error);
        })
        .finally(() => {
          setIsUploading(false);
        });
    },
    [disabled, handleFilePath, setOpen],
  );

  const handleUploadAudio = useCallback(() => {
    if (disabled) {
      return;
    }

    selectAndHandleFile(
      {
        title: "Upload Audio",
        filters: [
          {
            name: "Audio",
            extensions: ["wav", "mp3", "ogg", "mp4", "m4a", "flac"],
          },
        ],
      },
      "audio",
    );
  }, [disabled, selectAndHandleFile]);

  const handleUploadTranscript = useCallback(() => {
    if (disabled) {
      return;
    }

    selectAndHandleFile(
      {
        title: "Upload Transcript",
        filters: [{ name: "Transcript", extensions: ["vtt", "srt"] }],
      },
      "transcript",
    );
  }, [disabled, selectAndHandleFile]);

  const isProcessing = isUploading || isBatchProcessing;

  const triggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className={cn([
        "absolute right-2 top-1/2 -translate-y-1/2 z-10",
        "h-10 w-10 rounded-full hover:bg-white/20 transition-colors",
        "text-white/70 hover:text-white",
        open ? "bg-white/20 text-white" : null,
      ])}
      disabled={disabled || isProcessing}
    >
      {isProcessing ? (
        <LoaderIcon className="w-5 h-5 animate-spin" />
      ) : (
        <EllipsisVerticalIcon className="w-5 h-5" />
      )}
      <span className="sr-only">
        {isProcessing ? "Processing audio" : "More options"}
      </span>
    </Button>
  );

  if (isProcessing) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span className="inline-block">{triggerButton}</span>
        </TooltipTrigger>
        <TooltipContent side="top" align="end">
          <p className="text-xs">
            {isUploading ? "Uploading audio..." : "Processing audio..."}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (disabled && warningMessage) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span className="inline-block">{triggerButton}</span>
        </TooltipTrigger>
        <TooltipContent side="top" align="end">
          <ActionableTooltipContent
            message={warningMessage}
            action={
              onConfigure
                ? {
                    label: "Configure",
                    handleClick: onConfigure,
                  }
                : undefined
            }
          />
        </TooltipContent>
      </Tooltip>
    );
  }

  if (disabled) {
    return triggerButton;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-auto p-1.5">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            className="justify-start gap-2 h-9 px-3 whitespace-nowrap"
            onClick={handleUploadAudio}
          >
            <UploadCloudIcon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Upload audio</span>
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 h-9 px-3 whitespace-nowrap"
            onClick={handleUploadTranscript}
          >
            <FileTextIcon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Upload transcript</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
