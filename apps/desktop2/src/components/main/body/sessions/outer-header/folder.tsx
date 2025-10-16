import { useCallback } from "react";

import * as persisted from "../../../../../store/tinybase/persisted";
import { useTabs } from "../../../../../store/zustand/tabs";

export function FolderChain({ sessionId }: { sessionId: string }) {
  const folderId = persisted.UI.useCell("sessions", sessionId, "folder_id", persisted.STORE_ID);
  const title = persisted.UI.useCell("sessions", sessionId, "title", persisted.STORE_ID) ?? "Untitled";

  const handleChangeTitle = persisted.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (title: string) => ({ title }),
    [],
    persisted.STORE_ID,
  );

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      {!folderId
        ? <RenderIfRootNotExist title={title} handleChangeTitle={handleChangeTitle} />
        : <RenderIfRootExist title={title} handleChangeTitle={handleChangeTitle} folderId={folderId} />}
    </div>
  );
}

function RenderIfRootExist(
  {
    folderId,
    title,
    handleChangeTitle,
  }: {
    folderId: string;
    title: string;
    handleChangeTitle: (title: string) => void;
  },
) {
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
      <TitleInput title={title} handleChangeTitle={handleChangeTitle} />
    </>
  );
}

function RenderIfRootNotExist(
  {
    title,
    handleChangeTitle,
  }: {
    title: string;
    handleChangeTitle: (title: string) => void;
  },
) {
  return (
    <>
      <button className="text-gray-500 hover:text-gray-700">
        (select folder)
      </button>
      <span>/</span>
      <TitleInput title={title} handleChangeTitle={handleChangeTitle} />
    </>
  );
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

function useFolderList(rootFolderId: string) {
  const folderIds = persisted.UI.useLinkedRowIds(
    "folderToParentFolder",
    rootFolderId,
    persisted.STORE_ID,
  );
  return [...folderIds].reverse();
}

function TitleInput({ title, handleChangeTitle }: { title: string; handleChangeTitle: (title: string) => void }) {
  return (
    <input
      type="text"
      className="truncate max-w-[80px] border-none bg-transparent focus:outline-none focus:underline"
      value={title}
      onChange={(e) => handleChangeTitle(e.target.value)}
    />
  );
}
