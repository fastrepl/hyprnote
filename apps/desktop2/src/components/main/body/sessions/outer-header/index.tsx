import * as internal from "../../../../../store/tinybase/internal";

import { SessionEvent } from "./event";
import { FolderChain } from "./folder";
import { OthersButton } from "./other";
import { SessionParticipants } from "./participant";
import { ShareButton } from "./share";

export function OuterHeader({ sessionId }: { sessionId: string }) {
  const { user_id } = internal.UI.useValues(internal.STORE_ID);

  return (
    <div className="flex items-center justify-between">
      <FolderChain sessionId={sessionId} />

      <div className="flex items-center gap-1">
        <SessionEvent sessionId={sessionId} />
        <SessionParticipants
          sessionId={sessionId}
          currentUserId={user_id}
        />
        <ShareButton sessionId={sessionId} />
        <OthersButton sessionId={sessionId} />
      </div>
    </div>
  );
}
