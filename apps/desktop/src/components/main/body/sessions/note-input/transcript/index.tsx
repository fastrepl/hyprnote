import { TranscriptEditor } from "./editor";
import { TranscriptViewer } from "./viewer";

export function Transcript({ sessionId, isEditing }: { sessionId: string; isEditing: boolean }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {isEditing
        ? <TranscriptEditor sessionId={sessionId} />
        : <TranscriptViewer sessionId={sessionId} />}
    </div>
  );
}
