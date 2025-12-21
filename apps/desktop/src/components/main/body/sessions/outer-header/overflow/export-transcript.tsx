import { useMutation } from "@tanstack/react-query";
import { openPath } from "@tauri-apps/plugin-opener";
import { FileTextIcon, Loader2Icon } from "lucide-react";
import { useMemo } from "react";

import {
  commands as listener2Commands,
  type VttWord,
} from "@hypr/plugin-listener2";
import { DropdownMenuItem } from "@hypr/ui/components/ui/dropdown-menu";

import * as main from "../../../../../../store/tinybase/main";

export function ExportTranscript({ sessionId }: { sessionId: string }) {
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
