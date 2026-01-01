import { useMutation } from "@tanstack/react-query";
import { save } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { FileTextIcon, Loader2Icon } from "lucide-react";
import { useMemo } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as pdfCommands, type TranscriptItem } from "@hypr/plugin-pdf";
import { DropdownMenuItem } from "@hypr/ui/components/ui/dropdown-menu";

import * as main from "../../../../../../store/tinybase/store/main";

export function ExportPDF({ sessionId }: { sessionId: string }) {
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);

  const enhancedMd = main.UI.useCell(
    "sessions",
    sessionId,
    "enhanced_md",
    main.STORE_ID,
  ) as string;

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );

  const transcriptItems = useMemo((): TranscriptItem[] => {
    if (!store || !indexes || !transcriptIds || transcriptIds.length === 0) {
      return [];
    }

    const allWords: {
      speaker: string | null;
      text: string;
      start_ms: number;
    }[] = [];

    for (const transcriptId of transcriptIds) {
      const wordIds = indexes.getSliceRowIds(
        main.INDEXES.wordsByTranscript,
        transcriptId,
      );

      for (const wordId of wordIds ?? []) {
        const row = store.getRow("words", wordId);
        if (row) {
          allWords.push({
            speaker: (row.speaker as string | undefined) ?? null,
            text: row.text as string,
            start_ms: row.start_ms as number,
          });
        }
      }
    }

    allWords.sort((a, b) => a.start_ms - b.start_ms);

    const items: TranscriptItem[] = [];
    let currentSpeaker: string | null = null;
    let currentTexts: string[] = [];

    for (const word of allWords) {
      if (word.speaker !== currentSpeaker && currentTexts.length > 0) {
        items.push({ speaker: currentSpeaker, text: currentTexts.join(" ") });
        currentTexts = [];
      }
      currentSpeaker = word.speaker;
      currentTexts.push(word.text);
    }

    if (currentTexts.length > 0) {
      items.push({ speaker: currentSpeaker, text: currentTexts.join(" ") });
    }

    return items;
  }, [store, indexes, transcriptIds]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const path = await save({
        title: "Export to PDF",
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (!path) {
        return null;
      }

      const result = await pdfCommands.export(path, {
        enhancedMd: enhancedMd ?? "",
        transcript:
          transcriptItems.length > 0 ? { items: transcriptItems } : null,
      });

      if (result.status === "error") {
        throw new Error(result.error);
      }

      return path;
    },
    onSuccess: (path) => {
      if (path) {
        void analyticsCommands.event({
          event: "session_exported",
          format: "pdf",
          has_transcript: transcriptItems.length > 0,
          has_enhanced: !!enhancedMd,
        });
        void openPath(path);
      }
    },
    onError: console.error,
  });

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.preventDefault();
        void mutate(null);
      }}
      disabled={isPending}
      className="cursor-pointer"
    >
      {isPending ? <Loader2Icon className="animate-spin" /> : <FileTextIcon />}
      <span>{isPending ? "Exporting..." : "Export to PDF"}</span>
    </DropdownMenuItem>
  );
}
