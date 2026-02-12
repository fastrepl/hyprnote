import { ChevronDownIcon, RefreshCcwIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/utils";

import { useAudioPlayer } from "../../../../../../contexts/audio-player/provider";
import { useListener } from "../../../../../../contexts/listener";
import { useRunBatch } from "../../../../../../hooks/useRunBatch";
import { useSTTConnection } from "../../../../../../hooks/useSTTConnection";
import * as main from "../../../../../../store/tinybase/store/main";

export function EditingControls({
  sessionId,
  isEditing,
  setIsEditing,
}: {
  sessionId: string;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}) {
  const { audioExists } = useAudioPlayer();
  const { isLocalModel } = useSTTConnection();
  const isBatchProcessing = useListener(
    (state) => state.getSessionMode(sessionId) === "running_batch",
  );
  const store = main.UI.useStore(main.STORE_ID);
  const runBatch = useRunBatch(sessionId);
  const [isRedoing, setIsRedoing] = useState(false);

  const clearTranscriptData = useClearTranscript(sessionId);

  const handleRedoTranscript = useCallback(async () => {
    if (!audioExists || isBatchProcessing || !store) {
      return;
    }

    setIsEditing(false);
    setIsRedoing(true);

    try {
      clearTranscriptData();

      const result = await fsSyncCommands.audioPath(sessionId);
      if (result.status === "error") {
        console.error(
          "[redo_transcript] failed to retrieve audio path",
          result.error,
        );
        return;
      }

      const audioPath = result.data;
      if (!audioPath) {
        console.error("[redo_transcript] audio path not available");
        return;
      }

      await runBatch(audioPath);
    } catch (error) {
      console.error("[redo_transcript] failed", error);
    } finally {
      setIsRedoing(false);
    }
  }, [
    audioExists,
    clearTranscriptData,
    isBatchProcessing,
    runBatch,
    sessionId,
    setIsEditing,
    store,
  ]);

  const [open, setOpen] = useState(false);
  const {
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    handleEdit,
    handleSave,
    handleCancel,
  } = useTranscriptEditing({
    isEditing,
    setIsEditing,
  });

  const handleRedoClick = useCallback(() => {
    setOpen(false);
    void handleRedoTranscript();
  }, [handleRedoTranscript]);

  const canRerunTranscription = audioExists && !isLocalModel;

  const viewModeControls = canRerunTranscription ? (
    <div className="relative flex items-center">
      <button
        onClick={handleEdit}
        className={cn([
          "px-3 py-0.5 pr-8 rounded-xs text-xs",
          "bg-neutral-100 hover:bg-neutral-200 text-neutral-900",
          "transition-colors",
        ])}
      >
        Edit
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn([
              "absolute right-0.5 top-1/2 -translate-y-1/2 z-10",
              "h-6 w-6 rounded-xs hover:bg-neutral-300/50 transition-colors",
              "text-neutral-600 hover:text-neutral-900",
              open ? "bg-neutral-300/50 text-neutral-900" : null,
            ])}
          >
            <ChevronDownIcon
              className={cn([
                "w-4 h-4 transition-transform",
                open && "rotate-180",
              ])}
            />
            <span className="sr-only">More options</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="w-auto p-1.5">
          <div className="flex flex-col gap-1">
            <button
              onClick={handleRedoClick}
              disabled={isBatchProcessing || isRedoing}
              className={cn([
                "flex items-center gap-2 h-9 px-3 whitespace-nowrap rounded-xs text-sm",
                "text-left",
                isBatchProcessing || isRedoing
                  ? "text-neutral-400 cursor-not-allowed"
                  : "hover:bg-neutral-100 transition-colors",
              ])}
            >
              <RefreshCcwIcon
                size={12}
                className={cn([
                  (isBatchProcessing || isRedoing) && "animate-spin",
                ])}
              />
              <span className="text-xs">Rerun transcription</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  ) : (
    <button
      onClick={handleEdit}
      className={cn([
        "px-3 py-0.5 rounded-xs text-xs",
        "bg-neutral-100 hover:bg-neutral-200 text-neutral-900",
        "transition-colors",
      ])}
    >
      Edit
    </button>
  );

  const editModeControls = (
    <>
      <button
        onClick={handleUndo}
        disabled={!canUndo}
        className={cn([
          "px-3 py-0.5 rounded-xs text-xs",
          "transition-colors",
          canUndo
            ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-900"
            : "bg-neutral-50 text-neutral-400 cursor-not-allowed",
        ])}
      >
        &lt;
      </button>
      <button
        onClick={handleRedo}
        disabled={!canRedo}
        className={cn([
          "px-3 py-0.5 rounded-xs text-xs",
          "transition-colors",
          canRedo
            ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-900"
            : "bg-neutral-50 text-neutral-400 cursor-not-allowed",
        ])}
      >
        &gt;
      </button>
      <button
        onClick={handleCancel}
        className={cn([
          "px-3 py-0.5 rounded-xs text-xs",
          "bg-neutral-100 hover:bg-neutral-200 text-neutral-900",
          "transition-colors",
        ])}
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        className={cn([
          "px-3 py-0.5 rounded-xs text-xs",
          "bg-neutral-900 hover:bg-neutral-800 text-white",
          "transition-colors",
        ])}
      >
        Save
      </button>
    </>
  );

  return (
    <div className={cn(["flex items-center gap-2 my-2"])}>
      <div className="flex-1" />
      {isEditing ? editModeControls : viewModeControls}
    </div>
  );
}

function useTranscriptEditing({
  isEditing,
  setIsEditing,
}: {
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}) {
  const checkpoints = main.UI.useCheckpoints(main.STORE_ID);
  const checkpointIds = main.UI.useCheckpointIds(main.STORE_ID) ?? [
    [],
    undefined,
    [],
  ];
  const [, currentId, forwardIds] = checkpointIds;

  const baselineIdRef = useRef<string | undefined>(undefined);

  const canUndo = useMemo(
    () =>
      isEditing &&
      !!baselineIdRef.current &&
      !!currentId &&
      currentId !== baselineIdRef.current,
    [isEditing, currentId],
  );

  const canRedo = useMemo(
    () => isEditing && forwardIds.length > 0,
    [isEditing, forwardIds.length],
  );

  const handleUndo = useCallback(() => {
    if (canUndo && checkpoints) {
      checkpoints.goBackward();
    }
  }, [canUndo, checkpoints]);

  const handleRedo = useCallback(() => {
    if (canRedo && checkpoints) {
      checkpoints.goForward();
    }
  }, [canRedo, checkpoints]);

  const handleEdit = useCallback(() => {
    if (!checkpoints) {
      return;
    }
    const [, id] = checkpoints.getCheckpointIds();
    baselineIdRef.current =
      id ?? checkpoints.addCheckpoint("transcript_edit:baseline");
    setIsEditing(true);
  }, [checkpoints, setIsEditing]);

  const handleSave = useCallback(() => {
    if (!checkpoints) {
      return;
    }
    checkpoints.addCheckpoint("transcript_edit:save");
    baselineIdRef.current = undefined;
    setIsEditing(false);
  }, [checkpoints, setIsEditing]);

  const handleCancel = useCallback(() => {
    if (!checkpoints || baselineIdRef.current === undefined) {
      return;
    }
    checkpoints.goTo(baselineIdRef.current);
    baselineIdRef.current = undefined;
    setIsEditing(false);
  }, [checkpoints, setIsEditing]);

  return {
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    handleEdit,
    handleSave,
    handleCancel,
  };
}

function useClearTranscript(sessionId: string) {
  const store = main.UI.useStore(main.STORE_ID);
  const checkpoints = main.UI.useCheckpoints(main.STORE_ID);

  return useCallback(() => {
    if (!store) {
      return;
    }

    const transcriptIds: string[] = [];
    store.forEachRow("transcripts", (transcriptId, _forEachCell) => {
      const session = store.getCell("transcripts", transcriptId, "session_id");
      if (session === sessionId) {
        transcriptIds.push(transcriptId);
      }
    });

    if (transcriptIds.length === 0) {
      return;
    }

    store.transaction(() => {
      transcriptIds.forEach((transcriptId) => {
        store.delRow("transcripts", transcriptId);
      });
    });

    checkpoints?.addCheckpoint("redo_transcript:clear");
  }, [checkpoints, sessionId, store]);
}
