import { createQueries } from "tinybase/with-schemas";
import * as persisted from "../../../../../store/tinybase/persisted";

export function TranscriptView({ sessionId }: { sessionId: string }) {
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const QUERY = `${sessionId}_words`;
  const QUERIES = persisted.UI.useCreateQueries(
    store,
    (store) =>
      createQueries(store).setQueryDefinition(QUERY, "words", ({ select, where }) => {
        select("text");
        where("session_id", sessionId);
      }),
    [sessionId],
  );

  const words = persisted.UI.useResultTable(QUERY, QUERIES);

  return (
    <div className="relative h-full flex flex-col">
      <pre>{JSON.stringify(words)}</pre>
    </div>
  );
}
