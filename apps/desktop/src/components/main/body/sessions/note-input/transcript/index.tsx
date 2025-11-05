import { TranscriptEditor } from "./editor";
import { TranscriptViewer } from "./viewer";

export function Transcript({ sessionId, isEditing }: { sessionId: string; isEditing: boolean }) {
  return (
    <div className="relative h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        {isEditing
          ? <TranscriptEditor sessionId={sessionId} />
          : <TranscriptViewer sessionId={sessionId} />}
      </div>
    </div>
  );
}
