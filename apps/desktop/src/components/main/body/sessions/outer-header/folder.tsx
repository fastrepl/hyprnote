import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@hypr/ui/components/ui/breadcrumb";

import { FolderIcon } from "lucide-react";

import * as persisted from "../../../../../store/tinybase/persisted";
import { useTabs } from "../../../../../store/zustand/tabs";
import { FolderBreadcrumb } from "../../shared/folder-breadcrumb";
import { SearchableFolderDropdown } from "./shared/folder";

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
              <button onClick={() => openNew({ type: "folders", id })}>
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
  return (
    <>
      <BreadcrumbItem>
        <SearchableFolderDropdown
          sessionId={sessionId}
          trigger={
            <button className="text-neutral-500 hover:text-neutral-700 transition-colors outline-none">
              Select folder
            </button>
          }
        />
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
