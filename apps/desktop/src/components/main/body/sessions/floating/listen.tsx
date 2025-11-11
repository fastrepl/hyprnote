import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { useQueryClient } from "@tanstack/react-query";
import { downloadDir } from "@tauri-apps/api/path";
import { open as selectFile } from "@tauri-apps/plugin-dialog";
import { useMediaQuery } from "@uidotdev/usehooks";
import { Effect, pipe } from "effect";
import { EllipsisVerticalIcon, FileTextIcon, UploadCloudIcon } from "lucide-react";
import { useCallback, useState } from "react";

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
    loading: state.live.loading,
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
        <OptionsMenu
          sessionId={sessionId}
          disabled={disabled}
          warningMessage={warningMessage}
          onConfigure={handleAction}
        />
      </div>
    </div>
  );
}

type FileSelection = string | string[] | null;

function OptionsMenu({
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
  const runBatch = useRunBatch(sessionId);
  const queryClient = useQueryClient();

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
        if (!normalizedPath.endsWith(".vtt") && !normalizedPath.endsWith(".srt")) {
          return Effect.void;
        }

        return fromResult(tauriCommands.parseSubtitle(path));
      }

      if (!normalizedPath.endsWith(".wav") && !normalizedPath.endsWith(".mp3") && !normalizedPath.endsWith(".ogg")) {
        return Effect.void;
      }

      return pipe(
        fromResult(miscCommands.audioImport(sessionId, path)),
        Effect.tap(() =>
          Effect.sync(() => {
            queryClient.invalidateQueries({ queryKey: ["audio", sessionId, "exist"] });
            queryClient.invalidateQueries({ queryKey: ["audio", sessionId, "url"] });
          })
        ),
        Effect.flatMap((importedPath) => Effect.promise(() => runBatch(importedPath))),
      );
    },
    [queryClient, runBatch, sessionId],
  );

  const selectAndHandleFile = useCallback(
    (options: { title: string; filters: { name: string; extensions: string[] }[] }, kind: "audio" | "transcript") => {
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
            })
          )
        ),
        Effect.flatMap((selection) => handleFilePath(selection, kind)),
      );

      Effect.runPromise(program);
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
        filters: [{ name: "Audio", extensions: ["wav", "mp3", "ogg"] }],
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
      disabled={disabled}
    >
      <EllipsisVerticalIcon className="w-5 h-5" />
      <span className="sr-only">More options</span>
    </Button>
  );

  if (disabled && warningMessage) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span className="inline-block">{triggerButton}</span>
        </TooltipTrigger>
        <TooltipContent side="top" align="end">
          <ActionableTooltipContent
            message={warningMessage}
            action={onConfigure
              ? {
                label: "Configure",
                handleClick: onConfigure,
              }
              : undefined}
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
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
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
            disabled
          >
            <FileTextIcon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Upload transcript</span>
          </Button>
        </div>
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
