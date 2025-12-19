import { Icon } from "@iconify-icon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  FileTextIcon,
  FolderIcon,
  Link2Icon,
  Loader2Icon,
  MicIcon,
  MicOffIcon,
  MoreHorizontalIcon,
  TrashIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  commands as listener2Commands,
  type VttWord,
} from "@hypr/plugin-listener2";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { cn } from "@hypr/utils";

import { useListener } from "../../../../../contexts/listener";
import { useStartListening } from "../../../../../hooks/useStartListening";
import * as main from "../../../../../store/tinybase/main";
import { useHasTranscript } from "../shared";
import { SearchableFolderSubmenuContent } from "./shared/folder";

export function OverflowButton({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const audioExists = useQuery({
    queryKey: ["audio", sessionId, "exist"],
    queryFn: () => miscCommands.audioExist(sessionId),
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });
  const hasTranscript = useHasTranscript(sessionId);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost">
          <MoreHorizontalIcon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <Copy />
        <Folder sessionId={sessionId} setOpen={setOpen} />
        <ExportPDF />
        {hasTranscript && <ExportTranscript sessionId={sessionId} />}
        <DropdownMenuSeparator />
        <Listening sessionId={sessionId} />
        <DropdownMenuSeparator />
        {audioExists.data && <ShowInFinder sessionId={sessionId} />}
        <DeleteNote sessionId={sessionId} />
        {audioExists.data && <DeleteRecording sessionId={sessionId} />}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Copy() {
  const handleCopyLink = () => {};

  return (
    <DropdownMenuItem
      disabled={true}
      className="cursor-pointer"
      onClick={handleCopyLink}
    >
      <Link2Icon />
      <span>Copy link</span>
    </DropdownMenuItem>
  );
}

function Folder({
  sessionId,
  setOpen,
}: {
  sessionId: string;
  setOpen?: (open: boolean) => void;
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer">
        <FolderIcon />
        <span>Move to</span>
      </DropdownMenuSubTrigger>
      <SearchableFolderSubmenuContent sessionId={sessionId} setOpen={setOpen} />
    </DropdownMenuSub>
  );
}

function ExportPDF() {
  const handleExportPDF = () => {
    // TODO: Implement export to PDF functionality
    console.log("Export to PDF");
  };

  return (
    <DropdownMenuItem className="cursor-pointer" onClick={handleExportPDF}>
      <FileTextIcon />
      <span>Export to PDF</span>
    </DropdownMenuItem>
  );
}

function ExportTranscript({ sessionId }: { sessionId: string }) {
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );

  const words = useMemo(() => {
    if (!store || !indexes || !transcriptIds || transcriptIds.length === 0) {
      return [];
    }

    const allWords: VttWord[] = [];

    for (const transcriptId of transcriptIds) {
      const wordIds = indexes.getSliceRowIds(
        main.INDEXES.wordsByTranscript,
        transcriptId,
      );

      for (const wordId of wordIds ?? []) {
        const row = store.getRow("words", wordId);
        if (row) {
          allWords.push({
            text: row.text as string,
            start_ms: row.start_ms as number,
            end_ms: row.end_ms as number,
          });
        }
      }
    }

    return allWords.sort((a, b) => a.start_ms - b.start_ms);
  }, [store, indexes, transcriptIds]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const result = await listener2Commands.exportToVtt(sessionId, words);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (path) => {
      openPath(path);
    },
  });

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.preventDefault();
        mutate();
      }}
      disabled={isPending || words.length === 0}
      className="cursor-pointer"
    >
      {isPending ? <Loader2Icon className="animate-spin" /> : <FileTextIcon />}
      <span>{isPending ? "Exporting..." : "Export Transcript"}</span>
    </DropdownMenuItem>
  );
}

function ShowInFinder({ sessionId }: { sessionId: string }) {
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const result = await miscCommands.audioOpen(sessionId);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.preventDefault();
        mutate();
      }}
      disabled={isPending}
      className="cursor-pointer"
    >
      {isPending ? (
        <Loader2Icon className="animate-spin" />
      ) : (
        <Icon icon="ri:finder-line" />
      )}
      <span>{isPending ? "Opening..." : "Show in Finder"}</span>
    </DropdownMenuItem>
  );
}

function Listening({ sessionId }: { sessionId: string }) {
  const { mode, stop } = useListener((state) => ({
    mode: state.getSessionMode(sessionId),
    stop: state.stop,
  }));
  const isListening = mode === "running_active" || mode === "finalizing";
  const isFinalizing = mode === "finalizing";
  const isBatching = mode === "running_batch";
  const startListening = useStartListening(sessionId);

  const handleToggleListening = () => {
    if (isBatching) {
      return;
    }

    if (isListening) {
      stop();
    } else {
      startListening();
    }
  };

  return (
    <DropdownMenuItem
      className="cursor-pointer"
      onClick={handleToggleListening}
      disabled={isFinalizing || isBatching}
    >
      {isListening ? <MicOffIcon /> : <MicIcon />}
      <span>
        {isBatching
          ? "Batch processing"
          : isListening
            ? "Stop listening"
            : "Start listening"}
      </span>
    </DropdownMenuItem>
  );
}

function DeleteNote({ sessionId }: { sessionId: string }) {
  const deleteRow = main.UI.useDelRowCallback(
    "sessions",
    sessionId,
    main.STORE_ID,
  );

  const handleDeleteNote = useCallback(() => {
    deleteRow();
    void miscCommands.audioDelete(sessionId);
  }, [sessionId, deleteRow]);

  return (
    <DropdownMenuItem
      onClick={handleDeleteNote}
      className="text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
    >
      <TrashIcon />
      <span>Delete note</span>
    </DropdownMenuItem>
  );
}

function DeleteRecording({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const { mutate, isPending, isError } = useMutation({
    mutationFn: async () => {
      await Promise.all([
        new Promise((resolve) => setTimeout(resolve, 300)),
        miscCommands.audioDelete(sessionId).then((result) => {
          if (result.status === "error") {
            throw new Error(result.error);
          }

          return result.data;
        }),
      ]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.length >= 2 &&
          query.queryKey[0] === "audio" &&
          query.queryKey[1] === sessionId,
      });
    },
  });

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.preventDefault();
        mutate();
      }}
      disabled={isPending}
      className={cn([
        "cursor-pointer",
        isError
          ? "text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          : "text-red-600 hover:bg-red-50 hover:text-red-700",
      ])}
    >
      {isPending ? <Loader2Icon className="animate-spin" /> : <TrashIcon />}
      <span>
        {isPending
          ? "Deleting..."
          : isError
            ? "Failed to delete"
            : "Delete only recording"}
      </span>
    </DropdownMenuItem>
  );
}
