import { FolderChain } from "./folder";
import { SessionMetadata } from "./metadata";
import { OthersButton } from "./other";
import { ShareButton } from "./share";

export function OuterHeader({ sessionId }: { sessionId: string }) {
  return (
    <div className="flex items-center justify-between">
      <FolderChain sessionId={sessionId} />

      <div className="flex items-center gap-1">
        <SessionMetadata sessionId={sessionId} />
        <ShareButton sessionId={sessionId} />
        <OthersButton sessionId={sessionId} />
      </div>
    </div>
  );
}
