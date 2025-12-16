import {
  FolderIcon,
  FoldersIcon,
  PlusIcon,
  StickyNoteIcon,
} from "lucide-react";

import { cn } from "@hypr/utils";

import { useFolder, useSession } from "../../../../hooks/tinybase";
import * as main from "../../../../store/tinybase/main";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { FolderBreadcrumb, useFolderChain } from "../shared/folder-breadcrumb";
import { Section } from "./shared";

export const TabItemFolder: TabItem<Extract<Tab, { type: "folders" }>> = (
  props,
) => {
  if (props.tab.type === "folders" && props.tab.id === null) {
    return <TabItemFolderAll {...props} />;
  }

  if (props.tab.type === "folders" && props.tab.id !== null) {
    return <TabItemFolderSpecific {...props} />;
  }

  return null;
};

const TabItemFolderAll: TabItem<Extract<Tab, { type: "folders" }>> = ({
  tab,
  tabIndex,
  handleCloseThis: handleCloseThis,
  handleSelectThis: handleSelectThis,
  handleCloseAll,
  handleCloseOthers,
}) => {
  return (
    <TabItemBase
      icon={<FoldersIcon className="w-4 h-4" />}
      title={"Folders"}
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

const TabItemFolderSpecific: TabItem<Extract<Tab, { type: "folders" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  const folderId = tab.id!;
  const folders = useFolderChain(folderId);
  const folder = useFolder(folderId);
  const repeatCount = Math.max(0, folders.length - 1);
  const name = folder.name || "Untitled";
  const title = " .. / ".repeat(repeatCount) + name;

  return (
    <TabItemBase
      icon={<FolderIcon className="w-4 h-4" />}
      title={title}
      selected={tab.active}
      tabIndex={tabIndex}
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
      {tab.id === null ? (
        <TabContentFolderTopLevel />
      ) : (
        <TabContentFolderSpecific folderId={tab.id} />
      )}
    </StandardTabWrapper>
  );
}

function TabContentFolderTopLevel() {
  const topLevelFolderIds = main.UI.useSliceRowIds(
    main.INDEXES.foldersByParent,
    "",
    main.STORE_ID,
  );

  return (
    <div className="flex flex-col gap-6">
      <Section
        icon={<FolderIcon className="w-4 h-4" />}
        title="Folders"
        action={
          <button className="p-1 hover:bg-muted rounded">
            <PlusIcon className="w-4 h-4" />
          </button>
        }
      >
        {(topLevelFolderIds?.length ?? 0) > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {topLevelFolderIds!.map((folderId) => (
              <FolderCard key={folderId} folderId={folderId} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function FolderCard({ folderId }: { folderId: string }) {
  const folder = useFolder(folderId);
  const openCurrent = useTabs((state) => state.openCurrent);

  const childFolderIds = main.UI.useSliceRowIds(
    main.INDEXES.foldersByParent,
    folderId,
    main.STORE_ID,
  );

  const sessionIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionsByFolder,
    folderId,
    main.STORE_ID,
  );

  const childCount = (childFolderIds?.length ?? 0) + (sessionIds?.length ?? 0);

  return (
    <div
      className={cn([
        "flex flex-col items-center justify-center",
        "gap-2 p-6 border rounded-lg hover:bg-muted cursor-pointer",
      ])}
      onClick={() => openCurrent({ type: "folders", id: folderId })}
    >
      <FolderIcon className="w-12 h-12 text-muted-foreground" />
      <span className="text-sm font-medium text-center">{folder.name}</span>
      {childCount > 0 && (
        <span className="text-xs text-muted-foreground">
          {childCount} items
        </span>
      )}
    </div>
  );
}

function TabContentFolderSpecific({ folderId }: { folderId: string }) {
  const childFolderIds = main.UI.useSliceRowIds(
    main.INDEXES.foldersByParent,
    folderId,
    main.STORE_ID,
  );

  const sessionIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionsByFolder,
    folderId,
    main.STORE_ID,
  );

  const isEmpty =
    (childFolderIds?.length ?? 0) === 0 && (sessionIds?.length ?? 0) === 0;

  return (
    <div className="flex flex-col gap-6">
      <TabContentFolderBreadcrumb folderId={folderId} />

      <Section
        icon={<FolderIcon className="w-4 h-4" />}
        title="Folders"
        action={
          <button className="p-1 hover:bg-muted rounded">
            <PlusIcon className="w-4 h-4" />
          </button>
        }
      >
        {(childFolderIds?.length ?? 0) > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {childFolderIds!.map((childId) => (
              <FolderCard key={childId} folderId={childId} />
            ))}
          </div>
        )}
      </Section>

      {!isEmpty && (
        <Section
          icon={<StickyNoteIcon className="w-4 h-4" />}
          title="Notes"
          action={
            <button className="p-1 hover:bg-muted rounded">
              <PlusIcon className="w-4 h-4" />
            </button>
          }
        >
          {(sessionIds?.length ?? 0) > 0 && (
            <div className="space-y-2">
              {sessionIds!.map((sessionId) => (
                <FolderSessionItem key={sessionId} sessionId={sessionId} />
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function TabContentFolderBreadcrumb({ folderId }: { folderId: string }) {
  const openCurrent = useTabs((state) => state.openCurrent);

  return (
    <FolderBreadcrumb
      folderId={folderId}
      renderBefore={() => (
        <button
          onClick={() => openCurrent({ type: "folders", id: null })}
          className="hover:text-foreground"
        >
          <FoldersIcon className="w-4 h-4" />
        </button>
      )}
      renderCrumb={({ id, name, isLast }) => (
        <button
          onClick={() => !isLast && openCurrent({ type: "folders", id })}
          className={
            isLast ? "text-foreground font-medium" : "hover:text-foreground"
          }
        >
          {name}
        </button>
      )}
    />
  );
}

function FolderSessionItem({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId);
  const openCurrent = useTabs((state) => state.openCurrent);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted cursor-pointer"
      onClick={() => openCurrent({ type: "sessions", id: sessionId })}
    >
      <StickyNoteIcon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm">{session.title || "Untitled"}</span>
    </div>
  );
}
