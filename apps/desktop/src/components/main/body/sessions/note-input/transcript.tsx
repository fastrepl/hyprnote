import { createQueries } from "tinybase/with-schemas";
import * as persisted from "../../../../../store/tinybase/persisted";

import { useListener } from "../../../../../contexts/listener";

export function TranscriptView({ sessionId }: { sessionId: string }) {
  const partialWordsByChannel = useListener((state) => state.partialWordsByChannel);
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const transcriptIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.transcriptsBySession,
    sessionId,
    persisted.STORE_ID,
  );
  const transcriptId = transcriptIds?.[0];

  const QUERY = `${sessionId}_words`;
  const QUERIES = persisted.UI.useCreateQueries(
    store,
    (store) =>
      createQueries(store).setQueryDefinition(QUERY, "words", ({ select, where }) => {
        select("text");
        where("transcript_id", transcriptId);
      }),
    [sessionId, transcriptId],
  );

  const words = persisted.UI.useResultTable(QUERY, QUERIES) as Record<string, persisted.Word>;

  return (
    <div className="flex flex-col gap-2 overflow-y-auto max-h-64">
      {Object.values(words).map((word: persisted.Word) => word.text).join(" ")}

      {Object.entries(partialWordsByChannel).map(([channel, words]) => (
        <div key={channel} className="flex flex-row gap-1">
          <h3 className="text-sm font-medium">{channel}</h3>
          {words.map((word) => <div key={word.text}>{word.text}</div>)}
        </div>
      ))}
    </div>
  );
}
