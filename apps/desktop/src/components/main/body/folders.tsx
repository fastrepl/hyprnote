import { FolderIcon, StickyNoteIcon } from "lucide-react";

import * as persisted from "../../../store/tinybase/persisted";
import { type Tab } from "../../../store/zustand/tabs";
import { useTabs } from "../../../store/zustand/tabs";
import { StandardTabWrapper } from "./index";
import { type TabItem, TabItemBase } from "./shared";
import { FolderBreadcrumb } from "./shared/folder-breadcrumb";

export const TabItemFolder: TabItem = (props) => {
  if (props.tab.type === "folders" && props.tab.id === null) {
    return <TabItemFolderAll {...props} />;
  }

  if (props.tab.type === "folders" && props.tab.id !== null) {
    return <TabItemFolderSpecific {...props} />;
  }

  return null;
};

const TabItemFolderAll: TabItem = (
  {
    tab,
    handleCloseThis: handleCloseThis,
    handleSelectThis: handleSelectThis,
    handleCloseAll,
    handleCloseOthers,
  },
) => {
  return (
    <TabItemBase
      icon={<FolderIcon className="w-4 h-4" />}
      title={"Folder"}
      active={tab.active}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

const TabItemFolderSpecific: TabItem = ({
  tab,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  if (tab.type !== "folders" || tab.id === null) {
    return null;
  }

  const folderName = persisted.UI.useCell("folders", tab.id, "name", persisted.STORE_ID);

  return (
    <TabItemBase
      icon={<FolderIcon className="w-4 h-4" />}
      title={folderName ?? ""}
      active={tab.active}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentFolder({ tab }: { tab: Tab }) {
  if (tab.type !== "folders") {
    return null;
  }

  return (
    <StandardTabWrapper>
      {tab.id === null ? <TabContentFolderTopLevel /> : <TabContentFolderSpecific folderId={tab.id} />}
    </StandardTabWrapper>
  );
}

function TabContentFolderTopLevel() {
  const topLevelFolderIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.foldersByParent,
    "",
    persisted.STORE_ID,
  );

  return (
    <div className="flex flex-col gap-4 h-full">
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
      onClick={() => openCurrent({ type: "folders", id: folderId })}
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
    <div className="flex flex-col gap-4">
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

  return (
    <FolderBreadcrumb
      folderId={folderId}
      renderBefore={() => (
        <button
          onClick={() => openCurrent({ type: "folders", id: null })}
          className="hover:text-foreground"
        >
          Root
        </button>
      )}
      renderCrumb={({ id, name, isLast }) => (
        <button
          onClick={() => !isLast && openCurrent({ type: "folders", id })}
          className={isLast ? "text-foreground font-medium" : "hover:text-foreground"}
        >
          {name}
        </button>
      )}
    />
  );
}

function FolderSessionItem({ sessionId }: { sessionId: string }) {
  const session = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);
  const { openCurrent } = useTabs();

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted cursor-pointer"
      onClick={() => openCurrent({ type: "sessions", id: sessionId, state: { editor: "raw" } })}
    >
      <StickyNoteIcon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm">{session.title}</span>
    </div>
  );
}
