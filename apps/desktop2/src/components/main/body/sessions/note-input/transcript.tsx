import * as persisted from "../../../../../store/tinybase/persisted";

export function TranscriptEditorWrapper({
  sessionId,
}: {
  sessionId: string;
}) {
  const value = persisted.UI.useCell("sessions", sessionId, "transcript", persisted.STORE_ID);

  return <pre>{JSON.stringify(value, null, 2)}</pre>;
}
