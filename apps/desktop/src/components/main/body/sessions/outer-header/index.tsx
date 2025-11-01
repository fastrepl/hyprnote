import { FolderChain } from "./folder";
import { ListenButton } from "./listen";
import { MeetingMetadata } from "./metadata";
import { OverflowButton } from "./overflow";
import { ShareButton } from "./share";

export function OuterHeader({ sessionId }: { sessionId: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-2 min-w-fit pr-1">
        <div className="hidden md:block">
          <FolderChain sessionId={sessionId} />
        </div>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <MeetingMetadata sessionId={sessionId} />
          <ListenButton sessionId={sessionId} />
          <ShareButton sessionId={sessionId} />
          <OverflowButton sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}
