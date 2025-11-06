import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { useQueryClient } from "@tanstack/react-query";
import { downloadDir } from "@tauri-apps/api/path";
import { open as selectFile } from "@tauri-apps/plugin-dialog";
import { useMediaQuery } from "@uidotdev/usehooks";
import { Effect, pipe } from "effect";
import { EllipsisVerticalIcon, UploadCloudIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { useListener } from "../../../../../contexts/listener";
import { fromResult } from "../../../../../effect";
import { useRunBatch } from "../../../../../hooks/useRunBatch";
import { useStartListening } from "../../../../../hooks/useStartListening";
import * as main from "../../../../../store/tinybase/main";
import { type Tab } from "../../../../../store/zustand/tabs";
import { commands as tauriCommands } from "../../../../../types/tauri.gen";
import { RecordingIcon, useListenButtonState } from "../shared";
import { ActionableTooltipContent, FloatingButton } from "./shared";

export function ListenButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const { shouldRender } = useListenButtonState(tab.id);
  const { loading, stop } = useListener((state) => ({
    loading: state.loading,
    stop: state.stop,
  }));

  if (loading) {
    return (
      <FloatingButton onClick={stop}>
        <Spinner />
      </FloatingButton>
    );
  }

  if (shouldRender) {
    return <BeforeMeeingButton tab={tab} />;
  }

  return null;
}

function BeforeMeeingButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const remote = useRemoteMeeting(tab.id);
  const isNarrow = useMediaQuery("(max-width: 870px)");

  const { isDisabled, warningMessage } = useListenButtonState(tab.id);
  const handleClick = useStartListening(tab.id);

  let icon: React.ReactNode;
  let text: string;

  if (remote?.type === "zoom") {
    icon = <Icon icon="logos:zoom-icon" size={20} />;
    text = isNarrow ? "Join & Listen" : "Join Zoom & Start listening";
  } else if (remote?.type === "google-meet") {
    icon = <Icon icon="logos:google-meet" size={20} />;
    text = isNarrow ? "Join & Listen" : "Join Google Meet & Start listening";
  } else if (remote?.type === "webex") {
    icon = <Icon icon="simple-icons:webex" size={20} />;
    text = isNarrow ? "Join & Listen" : "Join Webex & Start listening";
  } else if (remote?.type === "teams") {
    icon = <Icon icon="logos:microsoft-teams" size={20} />;
    text = isNarrow ? "Join & Listen" : "Join Teams & Start listening";
  } else {
    icon = <RecordingIcon disabled={isDisabled} />;
    text = "Start listening";
  }

  return (
    <ListenSplitButton
      icon={icon}
      text={text}
      disabled={isDisabled}
      warningMessage={warningMessage}
      onPrimaryClick={handleClick}
      sessionId={tab.id}
    />
  );
}

function ListenSplitButton({
  icon,
  text,
  disabled,
  warningMessage,
  onPrimaryClick,
  sessionId,
}: {
  icon: React.ReactNode;
  text: string;
  disabled: boolean;
  warningMessage: string;
  onPrimaryClick: () => void;
  sessionId: string;
}) {
  const batchProgress = useListener((state) => state.batchProgress);
  const handleAction = useCallback(() => {
    onPrimaryClick();
    windowsCommands.windowShow({ type: "settings" })
      .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
      .then(() =>
        windowsCommands.windowEmitNavigate({ type: "settings" }, {
          path: "/app/settings",
          search: { tab: "transcription" },
        })
      );
  }, [onPrimaryClick]);

  const progress = useMemo<BatchProgressDisplay | null>(() => {
    if (!batchProgress) {
      return null;
    }

    const audio = Math.max(0, batchProgress.audioDuration ?? 0);
    const transcript = Math.max(0, batchProgress.transcriptDuration ?? 0);
    const clampedTranscript = audio > 0 ? Math.min(transcript, audio) : transcript;
    const ratio = audio > 0 ? clampedTranscript / audio : null;
    const percent = ratio !== null ? Math.round(ratio * 100) : null;

    return {
      percent,
      currentLabel: formatSeconds(clampedTranscript),
      totalLabel: audio > 0 ? formatSeconds(audio) : undefined,
    };
  }, [batchProgress]);

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="relative flex items-center">
        <FloatingButton
          onClick={onPrimaryClick}
          icon={icon}
          disabled={disabled}
          className="justify-center gap-2 pr-12"
          tooltip={warningMessage
            ? {
              side: "top",
              content: (
                <ActionableTooltipContent
                  message={warningMessage}
                  action={{
                    label: "Configure",
                    handleClick: handleAction,
                  }}
                />
              ),
            }
            : undefined}
        >
          {text}
        </FloatingButton>
        <OptionsMenu sessionId={sessionId} />
      </div>
      {progress ? <BatchProgressStatus progress={progress} /> : null}
    </div>
  );
}

type FileSelection = string | string[] | null;

type BatchProgressDisplay = {
  percent: number | null;
  currentLabel: string;
  totalLabel?: string;
};

function OptionsMenu({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const runBatch = useRunBatch(sessionId);
  const queryClient = useQueryClient();

  const handleFilePath = useCallback(
    (selection: FileSelection) => {
      if (!selection) {
        return Effect.void;
      }

      const path = Array.isArray(selection) ? selection[0] : selection;

      if (!path) {
        return Effect.void;
      }

      if (path.endsWith(".vtt") || path.endsWith(".srt")) {
        return pipe(
          fromResult(tauriCommands.parseSubtitle(path)),
          Effect.tap((subtitle) => Effect.sync(() => console.log(subtitle))),
        );
      }

      return pipe(
        fromResult(miscCommands.audioImport(sessionId, path)),
        Effect.tap(() =>
          Effect.sync(() => {
            queryClient.invalidateQueries({ queryKey: ["audio", sessionId, "exist"] });
            queryClient.invalidateQueries({ queryKey: ["audio", sessionId, "url"] });
          })
        ),
        Effect.flatMap((importedPath) => Effect.promise(() => runBatch(importedPath, { channels: 1 }))),
      );
    },
    [queryClient, runBatch, sessionId],
  );

  const handleSelectFile = useCallback(() => {
    const program = pipe(
      Effect.promise(() => downloadDir()),
      Effect.flatMap((defaultPath) =>
        Effect.promise(() =>
          selectFile({
            title: "Upload Audio or Transcript",
            multiple: false,
            directory: false,
            defaultPath,
            filters: [
              { name: "Audio", extensions: ["wav", "mp3", "ogg"] },
              { name: "Transcript", extensions: ["vtt", "srt"] },
            ],
          })
        )
      ),
      Effect.flatMap(handleFilePath),
      Effect.tap(() => Effect.sync(() => setOpen(false))),
    );

    Effect.runPromise(program);
  }, [handleFilePath]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn([
            "absolute right-2 top-1/2 -translate-y-1/2 z-10",
            "h-10 w-10 rounded-full hover:bg-white/20 transition-colors",
            "text-white/70 hover:text-white",
          ])}
        >
          <EllipsisVerticalIcon className="w-5 h-5" />
          <span className="sr-only">More options</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-auto p-1.5">
        <Button variant="ghost" className="justify-start gap-2 h-9 px-3 whitespace-nowrap" onClick={handleSelectFile}>
          <UploadCloudIcon className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">Upload audio or transcript</span>
        </Button>
      </PopoverContent>
    </Popover>
  );
}

type RemoteMeeting = { type: "zoom" | "google-meet" | "webex" | "teams"; url: string | null };

function useRemoteMeeting(sessionId: string): RemoteMeeting | null {
  const eventId = main.UI.useRemoteRowId(main.RELATIONSHIPS.sessionToEvent, sessionId);
  const note = main.UI.useCell("events", eventId ?? "", "note", main.STORE_ID);

  if (!note) {
    return null;
  }

  const remote = {
    type: "google-meet",
    url: null,
  } as RemoteMeeting | null;

  return remote;
}

function BatchProgressStatus({ progress }: { progress: BatchProgressDisplay }) {
  const { percent, currentLabel, totalLabel } = progress;
  const timing = totalLabel ? `${currentLabel} / ${totalLabel}` : currentLabel;

  return (
    <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 backdrop-blur">
      <Spinner size={12} className="text-white/80" />
      <span>
        Processing
        {percent !== null ? ` ${percent}%` : ""}
        {" · "}
        {timing}
      </span>
    </div>
  );
}

function formatSeconds(seconds: number): string {
  const total = Math.round(Math.max(0, seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
