import {
  FolderIcon,
  FoldersIcon,
  PlusIcon,
  StickyNoteIcon,
} from "lucide-react";
import { useMemo } from "react";

import {
  deriveFoldersFromSessions,
  type FolderNode,
  getFolderName,
} from "@hypr/store";
import { cn } from "@hypr/utils";

import { useSession } from "../../../../hooks/tinybase";
import * as main from "../../../../store/tinybase/store/main";
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
  handleCloseThis,
  handleSelectThis,
  handleCloseAll,
  handleCloseOthers,
  handlePinThis,
  handleUnpinThis,
}) => {
  return (
    <TabItemBase
      icon={<FoldersIcon className="w-4 h-4" />}
      title={"Folders"}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
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
  handlePinThis,
  handleUnpinThis,
}) => {
  const folderId = tab.id!;
  const folders = useFolderChain(folderId);
  const repeatCount = Math.max(0, folders.length - 1);
  const name = getFolderName(folderId) || "Untitled";
  const title = " .. / ".repeat(repeatCount) + name;

  return (
    <TabItemBase
      icon={<FolderIcon className="w-4 h-4" />}
      title={title}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
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
  const sessions = main.UI.useTable("sessions", main.STORE_ID);

  const topLevelFolders = useMemo(() => {
    return deriveFoldersFromSessions(sessions);
  }, [sessions]);

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
        {topLevelFolders.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {topLevelFolders.map((folder) => (
              <FolderCardFromNode key={folder.id} folder={folder} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function FolderCardFromNode({ folder }: { folder: FolderNode }) {
  const openCurrent = useTabs((state) => state.openCurrent);

  const sessionIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionsByFolder,
    folder.id,
    main.STORE_ID,
  );

  const childCount = folder.children.length + (sessionIds?.length ?? 0);

  return (
    <div
      className={cn([
        "flex flex-col items-center justify-center",
        "gap-2 p-6 border rounded-lg hover:bg-muted cursor-pointer",
      ])}
      onClick={() => openCurrent({ type: "folders", id: folder.id })}
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
  const sessions = main.UI.useTable("sessions", main.STORE_ID);

  const childFolders = useMemo(() => {
    const allFolders = deriveFoldersFromSessions(sessions);
    const findFolder = (
      folders: FolderNode[],
      id: string,
    ): FolderNode | undefined => {
      for (const folder of folders) {
        if (folder.id === id) return folder;
        const found = findFolder(folder.children, id);
        if (found) return found;
      }
      return undefined;
    };
    const currentFolder = findFolder(allFolders, folderId);
    return currentFolder?.children ?? [];
  }, [sessions, folderId]);

  const sessionIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionsByFolder,
    folderId,
    main.STORE_ID,
  );

  const isEmpty = childFolders.length === 0 && (sessionIds?.length ?? 0) === 0;

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
        {childFolders.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {childFolders.map((folder) => (
              <FolderCardFromNode key={folder.id} folder={folder} />
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
