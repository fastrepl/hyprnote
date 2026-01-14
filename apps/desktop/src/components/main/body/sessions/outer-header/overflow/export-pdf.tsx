import { useMutation } from "@tanstack/react-query";
import { save } from "@tauri-apps/plugin-dialog";
import { FileTextIcon, Loader2Icon } from "lucide-react";
import { useMemo } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import { commands as pdfCommands, type TranscriptItem } from "@hypr/plugin-pdf";
import { json2md } from "@hypr/tiptap/shared";
import { DropdownMenuItem } from "@hypr/ui/components/ui/dropdown-menu";

import * as main from "../../../../../../store/tinybase/store/main";
import { parseTranscriptWords } from "../../../../../../store/transcript/utils";
import type { EditorView } from "../../../../../../store/zustand/tabs/schema";

export function ExportPDF({
  sessionId,
  currentView,
}: {
  sessionId: string;
  currentView: EditorView;
}) {
  const store = main.UI.useStore(main.STORE_ID);

  const rawMd = main.UI.useCell(
    "sessions",
    sessionId,
    "raw_md",
    main.STORE_ID,
  ) as string | undefined;

  const enhancedNoteId = currentView.type === "enhanced" ? currentView.id : "";
  const enhancedNoteContent = main.UI.useCell(
    "enhanced_notes",
    enhancedNoteId,
    "content",
    main.STORE_ID,
  ) as string | undefined;

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );

  const transcriptItems = useMemo((): TranscriptItem[] => {
    if (!store || !transcriptIds || transcriptIds.length === 0) {
      return [];
    }

    const allWords: {
      speaker: string | null;
      text: string;
      start_ms: number;
    }[] = [];

    for (const transcriptId of transcriptIds) {
      const words = parseTranscriptWords(store, transcriptId);
      for (const word of words) {
        if (word.text === undefined || word.start_ms === undefined) continue;
        allWords.push({
          speaker: word.speaker ?? null,
          text: word.text,
          start_ms: word.start_ms,
        });
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
  }, [store, transcriptIds]);

  const getExportContent = useMemo(() => {
    return (): {
      enhancedMd: string;
      transcript: { items: TranscriptItem[] } | null;
    } => {
      switch (currentView.type) {
        case "raw": {
          let memoMd = "";
          if (rawMd) {
            try {
              const parsed = JSON.parse(rawMd);
              memoMd = json2md(parsed);
            } catch {
              memoMd = "";
            }
          }
          return {
            enhancedMd: memoMd,
            transcript: null,
          };
        }
        case "enhanced": {
          let enhancedMd = "";
          if (enhancedNoteContent) {
            try {
              const parsed = JSON.parse(enhancedNoteContent);
              enhancedMd = json2md(parsed);
            } catch {
              enhancedMd = "";
            }
          }
          return {
            enhancedMd,
            transcript: null,
          };
        }
        case "transcript": {
          return {
            enhancedMd: "",
            transcript:
              transcriptItems.length > 0 ? { items: transcriptItems } : null,
          };
        }
        default:
          return {
            enhancedMd: "",
            transcript: null,
          };
      }
    };
  }, [currentView, rawMd, enhancedNoteContent, transcriptItems]);

  const getExportLabel = () => {
    switch (currentView.type) {
      case "raw":
        return "Export Memo to PDF";
      case "enhanced":
        return "Export Summary to PDF";
      case "transcript":
        return "Export Transcript to PDF";
      default:
        return "Export to PDF";
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const path = await save({
        title: getExportLabel(),
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (!path) {
        return null;
      }

      const exportContent = getExportContent();
      const result = await pdfCommands.export(path, exportContent);

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
          view_type: currentView.type,
          has_transcript:
            currentView.type === "transcript" && transcriptItems.length > 0,
          has_enhanced:
            currentView.type === "enhanced" && !!enhancedNoteContent,
          has_memo: currentView.type === "raw" && !!rawMd,
        });
        void openerCommands.openPath(path, null);
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
      <span>{isPending ? "Exporting..." : getExportLabel()}</span>
    </DropdownMenuItem>
  );
}
