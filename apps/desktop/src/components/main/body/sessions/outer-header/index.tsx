import { FolderChain } from "./folder";
import { MeetingMetadata } from "./metadata";
import { OthersButton } from "./other";
import { ShareButton } from "./share";

export function OuterHeader({ sessionId }: { sessionId: string }) {
  return (
    <div className="flex items-center justify-between">
      <FolderChain sessionId={sessionId} />

      <div className="flex items-center gap-1">
        <MeetingMetadata sessionId={sessionId} />
        <ShareButton sessionId={sessionId} />
        <OthersButton sessionId={sessionId} />
      </div>
    </div>
  );
}
