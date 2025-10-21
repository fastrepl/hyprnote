import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@hypr/ui/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";

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
    <Breadcrumb className="ml-1.5">
      <BreadcrumbList className="text-neutral-700 text-xs">
        {folderId && <FolderIcon className="w-3 h-3 mr-1" />}
        {!folderId
          ? <RenderIfRootNotExist title={title} handleChangeTitle={handleChangeTitle} sessionId={sessionId} />
          : <RenderIfRootExist title={title} handleChangeTitle={handleChangeTitle} folderId={folderId} />}
      </BreadcrumbList>
    </Breadcrumb>
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
        renderSeparator={({ index }) => (index > 0 ? <BreadcrumbSeparator /> : null)}
        renderCrumb={({ id, name }) => (
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <button onClick={() => openNew({ type: "folders", id, active: true })}>
                {name}
              </button>
            </BreadcrumbLink>
          </BreadcrumbItem>
        )}
      />
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>
          <TitleInput title={title} handleChangeTitle={handleChangeTitle} />
        </BreadcrumbPage>
      </BreadcrumbItem>
    </>
  );
}

function RenderIfRootNotExist(
  {
    title,
    handleChangeTitle,
    sessionId,
  }: {
    title: string;
    handleChangeTitle: (title: string) => void;
    sessionId: string;
  },
) {
  const folderIds = persisted.UI.useRowIds("folders", persisted.STORE_ID);

  const handleSelectFolder = persisted.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (folderId: string) => ({ folder_id: folderId }),
    [],
    persisted.STORE_ID,
  );

  return (
    <>
      <BreadcrumbItem>
        <DropdownMenu>
          <DropdownMenuTrigger className="text-neutral-500 hover:text-neutral-700 transition-colors outline-none">
            Select folder
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {folderIds?.map((id) => <FolderMenuItem key={id} folderId={id} onSelect={() => handleSelectFolder(id)} />)}
            {(!folderIds || folderIds.length === 0) && (
              <DropdownMenuItem disabled>No folders available</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>
          <TitleInput title={title} handleChangeTitle={handleChangeTitle} />
        </BreadcrumbPage>
      </BreadcrumbItem>
    </>
  );
}

function FolderMenuItem({ folderId, onSelect }: { folderId: string; onSelect: () => void }) {
  const name = persisted.UI.useCell("folders", folderId, "name", persisted.STORE_ID);

  return (
    <DropdownMenuItem onSelect={onSelect}>
      <FolderIcon className="w-4 h-4" />
      {name ?? "Untitled"}
    </DropdownMenuItem>
  );
}

function TitleInput({ title, handleChangeTitle }: { title: string; handleChangeTitle: (title: string) => void }) {
  return (
    <input
      type="text"
      placeholder="Untitled"
      className="truncate max-w-[80px] border-none bg-transparent text-neutral-700 focus:outline-none focus:underline"
      value={title ?? ""}
      onChange={(e) => handleChangeTitle(e.target.value)}
    />
  );
}
