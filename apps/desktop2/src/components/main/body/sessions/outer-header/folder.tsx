import { useCallback } from "react";

import * as persisted from "../../../../../store/tinybase/persisted";
import { useTabs } from "../../../../../store/zustand/tabs";

export function FolderChain({ sessionId }: { sessionId: string }) {
  const folderId = persisted.UI.useCell("sessions", sessionId, "folder_id", persisted.STORE_ID);
  const title = persisted.UI.useCell("sessions", sessionId, "title", persisted.STORE_ID);

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      {!folderId
        ? <RenderIfRootNotExist sessionId={sessionId} />
        : <RenderIfRootExist folderId={folderId} title={title ?? "Untitled"} />}
    </div>
  );
}

function RenderIfRootExist({ folderId, title }: { folderId: string; title: string }) {
  const folderIds = useFolderList(folderId);
  return (
    <>
      {folderIds.map((id, index) => (
        <div key={id} className="flex items-center gap-1">
          {index > 0 && <span>/</span>}
          <FolderItem folderId={id} />
        </div>
      ))}
      <span>/</span>
      <span className="truncate max-w-[80px]">{title}</span>
    </>
  );
}

function RenderIfRootNotExist({ sessionId }: { sessionId: string }) {
  const title = persisted.UI.useCell("sessions", sessionId, "title", persisted.STORE_ID);

  return (
    <>
      <button className="text-gray-500 hover:text-gray-700">
        (select folder)
      </button>
      <span>/</span>
      <span className="truncate max-w-[80px]">{title ?? "Untitled"}</span>
    </>
  );
}

function useFolderList(rootFolderId: string) {
  const folderIds = persisted.UI.useLinkedRowIds(
    "folderToParentFolder",
    rootFolderId,
    persisted.STORE_ID,
  );
  return [...folderIds].reverse();
}

function FolderItem({ folderId }: { folderId: string }) {
  const folderName = persisted.UI.useCell("folders", folderId, "name", persisted.STORE_ID);

  const { openNew } = useTabs();
  const handleClick = useCallback(() => {
    openNew({ type: "folders", id: folderId, active: true });
  }, [openNew, folderId]);

  return (
    <button
      className="text-gray-500 hover:text-gray-700 hover:underline"
      onClick={handleClick}
    >
      {folderName}
    </button>
  );
}
