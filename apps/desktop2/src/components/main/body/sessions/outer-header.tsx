import { useCallback } from "react";

import * as persisted from "../../../../store/tinybase/persisted";
import { useTabs } from "../../../../store/zustand/tabs";

export function OuterHeader(
  { sessionRow }: { sessionRow: ReturnType<typeof persisted.UI.useRow<"sessions">> },
) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {sessionRow.folder_id && (
          <TabContentNoteHeaderFolderChain
            title={sessionRow.title ?? ""}
            folderId={sessionRow.folder_id}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <DateTimeButton sessionRow={sessionRow} />
        <ParticipantsButton sessionRow={sessionRow} />
        {sessionRow.event_id && <RecordingButton sessionRow={sessionRow} />}
        <ListenButton sessionRow={sessionRow} />
        {shouldShowShareButton(sessionRow) && <ShareButton sessionRow={sessionRow} />}
        <OthersButton sessionRow={sessionRow} />
      </div>
    </div>
  );
}

function TabContentNoteHeaderFolderChain({ title, folderId }: { title: string; folderId: string }) {
  const folderIds = persisted.UI.useLinkedRowIds(
    "folderToParentFolder",
    folderId,
    persisted.STORE_ID,
  );

  if (!folderIds || folderIds.length === 0) {
    return null;
  }

  const folderChain = [...folderIds].reverse();

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      {folderChain.map((id, index) => (
        <div key={id} className="flex items-center gap-1">
          {index > 0 && <span>/</span>}
          <TabContentNoteHeaderFolder folderId={id} />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span>/</span>
        <span className="truncate max-w-[80px]">{title}</span>
      </div>
    </div>
  );
}

function TabContentNoteHeaderFolder({ folderId }: { folderId: string }) {
  const folderName = persisted.UI.useCell("folders", folderId, "name", persisted.STORE_ID);

  const { openNew } = useTabs();
  const handleClick = useCallback(() => {
    openNew({ type: "folders", id: folderId, active: true });
  }, [openNew, folderId]);

  return (
    <button
      className="text-gray-500 hover:text-gray-700"
      onClick={handleClick}
    >
      {folderName}
    </button>
  );
}

// Helper function to determine if share button should be shown
function shouldShowShareButton(_sessionRow: ReturnType<typeof persisted.UI.useRow<"sessions">>) {
  // Add your condition here
  return false;
}

// Button Components
type SessionRowProp = {
  sessionRow: ReturnType<typeof persisted.UI.useRow<"sessions">>;
};

function DateTimeButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="text-xs">
      📅 Today (Fri)
    </button>
  );
}

function ParticipantsButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="text-xs">
      👤 John Jeong + 4
    </button>
  );
}

function RecordingButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="text-xs">
      🎙️ 02:27
    </button>
  );
}

function ListenButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="px-2 py-1 bg-black text-white rounded text-xs">
      🔴 Start listening
    </button>
  );
}

function ShareButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="text-xs">
      Share
    </button>
  );
}

function OthersButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="text-xs">
      •••
    </button>
  );
}
