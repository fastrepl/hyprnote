import { TranscriptViewer } from "./viewer";

export function Transcript({ sessionId }: { sessionId: string }) {
  return <TranscriptViewer sessionId={sessionId} />;
}
