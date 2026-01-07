import { useMutation } from "@tanstack/react-query";
import { openPath } from "@tauri-apps/plugin-opener";
import { FileTextIcon, Loader2Icon } from "lucide-react";
import { useMemo } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import {
  commands as listener2Commands,
  type VttWord,
} from "@hypr/plugin-listener2";
import { DropdownMenuItem } from "@hypr/ui/components/ui/dropdown-menu";

import * as main from "../../../../../../store/tinybase/store/main";
import { parseTranscriptWords } from "../../../../../../store/transcript/utils";

export function ExportTranscript({ sessionId }: { sessionId: string }) {
  const store = main.UI.useStore(main.STORE_ID);

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );

  const words = useMemo(() => {
    if (!store || !transcriptIds || transcriptIds.length === 0) {
      return [];
    }

    const allWords: VttWord[] = [];

    for (const transcriptId of transcriptIds) {
      const words = parseTranscriptWords(store, transcriptId);
      for (const word of words) {
        if (
          word.text === undefined ||
          word.start_ms === undefined ||
          word.end_ms === undefined
        ) {
          continue;
        }
        allWords.push({
          text: word.text,
          start_ms: word.start_ms,
          end_ms: word.end_ms,
          speaker: null,
        });
      }
    }

    return allWords.sort((a, b) => a.start_ms - b.start_ms);
  }, [store, transcriptIds]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const result = await listener2Commands.exportToVtt(sessionId, words);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (path) => {
      void analyticsCommands.event({
        event: "session_exported",
        format: "vtt",
        word_count: words.length,
      });
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
