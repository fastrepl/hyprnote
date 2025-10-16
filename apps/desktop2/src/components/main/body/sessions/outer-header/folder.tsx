import { FolderIcon } from "lucide-react";

import * as persisted from "../../../../../store/tinybase/persisted";
import { useTabs } from "../../../../../store/zustand/tabs";
import { FolderBreadcrumb } from "../../shared/folder-breadcrumb";

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
      {folderId && <FolderIcon className="w-3 h-3" />}
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
  const { openNew } = useTabs();

  return (
    <>
      <FolderBreadcrumb
        folderId={folderId}
        renderSeparator={({ index }) => (index > 0 ? <span>/</span> : null)}
        renderCrumb={({ id, name }) => (
          <button
            className="text-gray-500 hover:text-gray-700 hover:underline"
            onClick={() => openNew({ type: "folders", id, active: true })}
          >
            {name}
          </button>
        )}
      />
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
