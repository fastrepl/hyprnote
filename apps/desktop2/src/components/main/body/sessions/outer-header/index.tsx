import * as persisted from "../../../../../store/tinybase/persisted";

import { SessionEvent } from "./event";
import { FolderChain } from "./folder";
import { ListenButton } from "./listen";
import { OthersButton } from "./other";
import { SessionParticipants } from "./participant";
import { RecordingButton } from "./recording";
import { ShareButton } from "./share";

export function OuterHeader(
  { sessionRow, sessionId }: {
    sessionRow: ReturnType<typeof persisted.UI.useRow<"sessions">>;
    sessionId: string;
  },
) {
  const currentUserId = persisted.UI.useCell("configs", "singleton", "user_id", persisted.STORE_ID) as
    | string
    | undefined;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {sessionRow.folder_id && (
          <FolderChain
            title={sessionRow.title ?? ""}
            folderId={sessionRow.folder_id}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <SessionEvent
          sessionRow={sessionRow}
          sessionId={sessionId}
        />
        <SessionParticipants
          sessionId={sessionId}
          currentUserId={currentUserId}
        />
        <RecordingButton sessionRow={sessionRow} />
        <ListenButton sessionRow={sessionRow} />
        <ShareButton sessionRow={sessionRow} />
        <OthersButton sessionRow={sessionRow} />
      </div>
    </div>
  );
}
