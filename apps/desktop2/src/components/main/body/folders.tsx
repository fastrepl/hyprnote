import { FolderIcon, StickyNoteIcon } from "lucide-react";

import * as persisted from "../../../store/tinybase/persisted";
import { type Tab } from "../../../store/zustand/tabs";
import { useTabs } from "../../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemFolder: TabItem = ({ tab, handleClose, handleSelect }) => {
  if (tab.type === "folders" && tab.id === null) {
    return <TabItemFolderAll tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }

  if (tab.type === "folders" && tab.id !== null) {
    return <TabItemFolderSpecific tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }

  return null;
};

const TabItemFolderAll: TabItem = ({ tab, handleClose, handleSelect }) => {
  return (
    <TabItemBase
      icon={<FolderIcon className="w-4 h-4" />}
      title={"Folder"}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
};

const TabItemFolderSpecific: TabItem = ({ tab, handleClose, handleSelect }) => {
  if (tab.type !== "folders" || tab.id === null) {
    return null;
  }

  const folderName = persisted.UI.useCell("folders", tab.id, "name", persisted.STORE_ID);

  return (
    <TabItemBase
      icon={<FolderIcon className="w-4 h-4" />}
      title={folderName ?? ""}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
};

export function TabContentFolder({ tab }: { tab: Tab }) {
  if (tab.type !== "folders") {
    return null;
  }

  // If tab.id is null, show top-level folders
  if (tab.id === null) {
    return <TabContentFolderTopLevel />;
  }

  // If tab.id is a folder, show that folder's contents
  return <TabContentFolderSpecific folderId={tab.id} />;
}

function TabContentFolderTopLevel() {
  const topLevelFolderIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.foldersByParent,
    "",
    persisted.STORE_ID,
  );

  return (
    <div className="flex flex-col gap-4 p-4 rounded-lg border">
      <h2 className="text-lg font-semibold">All Folders</h2>
      <div className="grid grid-cols-4 gap-4">
        {topLevelFolderIds?.map((folderId) => <FolderCard key={folderId} folderId={folderId} />)}
      </div>
    </div>
  );
}

function FolderCard({ folderId }: { folderId: string }) {
  const folder = persisted.UI.useRow("folders", folderId, persisted.STORE_ID);
  const { openCurrent } = useTabs();

  // Count children
  const childFolderIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.foldersByParent,
    folderId,
    persisted.STORE_ID,
  );

  const sessionIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.sessionsByFolder,
    folderId,
    persisted.STORE_ID,
  );

  const childCount = (childFolderIds?.length ?? 0) + (sessionIds?.length ?? 0);

  return (
    <div
      className="flex flex-col items-center justify-center gap-2 p-6 border rounded-lg hover:bg-muted cursor-pointer"
      onClick={() => openCurrent({ type: "folders", id: folderId, active: true })}
    >
      <FolderIcon className="w-12 h-12 text-muted-foreground" />
      <span className="text-sm font-medium text-center">{folder.name}</span>
      {childCount > 0 && <span className="text-xs text-muted-foreground">{childCount} items</span>}
    </div>
  );
}

function TabContentFolderSpecific({ folderId }: { folderId: string }) {
  const childFolderIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.foldersByParent,
    folderId,
    persisted.STORE_ID,
  );

  const sessionIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.sessionsByFolder,
    folderId,
    persisted.STORE_ID,
  );

  return (
    <div className="flex flex-col gap-4 p-4 rounded-lg border">
      <TabContentFolderBreadcrumb folderId={folderId} />

      {(childFolderIds?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Folders</h3>
          <div className="grid grid-cols-4 gap-4">
            {childFolderIds!.map((childId) => <FolderCard key={childId} folderId={childId} />)}
          </div>
        </div>
      )}

      {(sessionIds?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
          <div className="space-y-2">
            {sessionIds!.map((sessionId) => <FolderSessionItem key={sessionId} sessionId={sessionId} />)}
          </div>
        </div>
      )}

      {(childFolderIds?.length ?? 0) === 0 && (sessionIds?.length ?? 0) === 0 && (
        <div className="text-center text-muted-foreground py-8">
          This folder is empty
        </div>
      )}
    </div>
  );
}

function TabContentFolderBreadcrumb({ folderId }: { folderId: string }) {
  const { openCurrent } = useTabs();

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
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
      <button
        onClick={() => openCurrent({ type: "folders", id: null, active: true })}
        className="hover:text-foreground"
      >
        Root
      </button>
      {folderChain.map((id) => {
        const isLast = id === folderId;
        return (
          <div key={id} className="flex items-center gap-2">
            <span>/</span>
            <button
              onClick={() => !isLast && openCurrent({ type: "folders", id, active: true })}
              className={isLast ? "text-foreground font-medium" : "hover:text-foreground"}
            >
              <TabContentFolderBreadcrumbItem folderId={id} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function TabContentFolderBreadcrumbItem({ folderId }: { folderId: string }) {
  const folderName = persisted.UI.useCell("folders", folderId, "name", persisted.STORE_ID);
  return <span>{folderName}</span>;
}

function FolderSessionItem({ sessionId }: { sessionId: string }) {
  const session = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);
  const { openCurrent } = useTabs();

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted cursor-pointer"
      onClick={() => openCurrent({ type: "sessions", id: sessionId, active: true, state: { editor: "raw" } })}
    >
      <StickyNoteIcon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm">{session.title}</span>
    </div>
  );
}
