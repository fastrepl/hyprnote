import { FolderChain } from "./folder";
import { InMeetingIndicator } from "./in-meeting-indicator";
import { MeetingMetadata } from "./metadata";
import { OverflowButton } from "./overflow";
import { ShareButton } from "./share";

export function OuterHeader({ sessionId }: { sessionId: string }) {
  return (
    <div className="flex items-center justify-between">
      <FolderChain sessionId={sessionId} />

      <div className="flex items-center">
        <MeetingMetadata sessionId={sessionId} />
        <InMeetingIndicator sessionId={sessionId} />
        <ShareButton sessionId={sessionId} />
        <OverflowButton sessionId={sessionId} />
      </div>
    </div>
  );
}
