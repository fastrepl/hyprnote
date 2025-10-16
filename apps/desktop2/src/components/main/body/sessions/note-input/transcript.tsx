import { type Word2 } from "@hypr/plugin-listener";
import TranscriptEditor, { type SpeakerViewInnerProps } from "@hypr/tiptap/transcript";

import * as persisted from "../../../../../store/tinybase/persisted";

export function TranscriptEditorWrapper({
  sessionId,
}: {
  sessionId: string;
}) {
  const value = persisted.UI.useCell("sessions", sessionId, "transcript", persisted.STORE_ID);

  const handleTranscriptChange = persisted.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: Word2[]) => ({ transcript: JSON.stringify(input) }),
    [],
    persisted.STORE_ID,
  );

  const parseTranscript = (value: string): Word2[] | null => {
    if (!value) {
      return null;
    }
    try {
      const parsed = JSON.parse(value);
      return parsed.words ?? null;
    } catch {
      return null;
    }
  };

  return (
    <TranscriptEditor
      key={`session-${sessionId}-transcript`}
      initialWords={parseTranscript(value ?? "")}
      editable={true}
      onUpdate={handleTranscriptChange}
      c={SpeakerSelector}
    />
  );
}

function SpeakerSelector({ speakerLabel, speakerIndex }: SpeakerViewInnerProps) {
  const displayLabel = speakerLabel || `Speaker ${speakerIndex ?? 0}`;
  return <span className="font-medium text-neutral-700">{displayLabel}</span>;
}
