import * as internal from "../../../../../store/tinybase/internal";
import * as persisted from "../../../../../store/tinybase/persisted";

import { SessionEvent } from "./event";
import { FolderChain } from "./folder";
import { ListenButton } from "./listen";
import { OthersButton } from "./other";
import { SessionParticipants } from "./participant";
import { RecordingButton } from "./recording";
import { ShareButton } from "./share";

export function OuterHeader(
  { sessionRow, sessionId, onToggleAudioPlayer, isAudioPlayerVisible }: {
    sessionRow: ReturnType<typeof persisted.UI.useRow<"sessions">>;
    sessionId: string;
    onToggleAudioPlayer: () => void;
    isAudioPlayerVisible: boolean;
  },
) {
  const { user_id } = internal.UI.useValues(internal.STORE_ID);

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
          currentUserId={user_id}
        />
        <RecordingButton
          sessionRow={sessionRow}
          onToggle={onToggleAudioPlayer}
          isActive={isAudioPlayerVisible}
        />
        <ListenButton sessionRow={sessionRow} />
        <ShareButton sessionRow={sessionRow} />
        <OthersButton sessionRow={sessionRow} />
      </div>
    </div>
  );
}
