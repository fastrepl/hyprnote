import { TranscriptContainer } from "./shared";

export function TranscriptViewer({ sessionId }: { sessionId: string }) {
  return <TranscriptContainer sessionId={sessionId} />;
}
