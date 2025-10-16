import { type Word2 } from "@hypr/plugin-listener";
import TranscriptEditor, { type SpeakerViewInnerProps } from "@hypr/tiptap/transcript";

export function TranscriptEditorWrapper({
  editorKey,
  value,
  onChange,
}: {
  editorKey: string;
  value: string;
  onChange: (value: string) => void;
}) {
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
      key={editorKey}
      initialWords={parseTranscript(value)}
      editable={true}
      onUpdate={(words) => {
        onChange(JSON.stringify({ words }));
      }}
      c={SpeakerSelector}
    />
  );
}

function SpeakerSelector({ speakerLabel, speakerIndex }: SpeakerViewInnerProps) {
  const displayLabel = speakerLabel || `Speaker ${speakerIndex ?? 0}`;
  return <span className="font-medium text-neutral-700">{displayLabel}</span>;
}
