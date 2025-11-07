import { TranscriptEditor } from "./editor";
import { TranscriptionProgress } from "./progress";
import { TranscriptViewer } from "./viewer";

export function Transcript({ sessionId, isEditing }: { sessionId: string; isEditing: boolean }) {
  return (
    <div className="relative flex h-full flex-col">
      <TranscriptionProgress sessionId={sessionId} />
      <div className="flex-1 overflow-hidden">
        {isEditing
          ? <TranscriptEditor sessionId={sessionId} />
          : <TranscriptViewer sessionId={sessionId} />}
      </div>
    </div>
  );
}
