import { createFileRoute, redirect } from "@tanstack/react-router";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import clsx from "clsx";
import { z } from "zod";
import * as persisted from "../tinybase/store/persisted";

import { commands as windowsCommands, getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@hypr/ui/components/ui/resizable";
import { useLeftSidebar, useRightPanel } from "@hypr/utils/contexts";
import { Chat } from "../components/chat";
import { Sidebar } from "../components/sidebar";
import { useTabs } from "../hooks/useTabs";
import { type Tab, tabSchema } from "../types";
import { id } from "../utils";

const schema = z.object({
  new: z.boolean().default(false),
  tabs: z.array(tabSchema).default([]),
});

export const Route = createFileRoute("/app/_layout/main/")({
  validateSearch: zodValidator(schema),
  beforeLoad: ({ search, context: { internalStore, persistedStore } }) => {
    if (search.new) {
      const sessionId = id();
      const user_id = internalStore!.getValue("user_id")!;

      persistedStore!.setRow("sessions", sessionId, {
        title: "new",
        user_id,
        created_at: new Date().toISOString(),
      });

      throw redirect({
        to: "/app/main",
        search: {
          ...search,
          tabs: [
            ...search.tabs.map((t) => ({ ...t, active: false })),
            {
              id: sessionId,
              type: "note",
              active: true,
            },
          ],
          new: false,
        },
      });
    }

    if (search.tabs.length === 0) {
      throw redirect({ to: "/app/main", search: { new: true } });
    }

    const activeTabs = search.tabs.filter((t) => t.active);

    if (activeTabs.length > 1) {
      const normalizedTabs = search.tabs.map((t, idx) => ({
        ...t,
        active: activeTabs.length === 0 ? idx === 0 : t.id === activeTabs[0].id,
      }));

      throw redirect({
        to: "/app/main",
        search: { tabs: normalizedTabs },
      });
    } else if (activeTabs.length === 0) {
      throw redirect({
        to: "/app/main",
        search: { tabs: search.tabs.map((t, idx) => ({ ...t, active: idx === 0 })) },
      });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps: { tabs } }) => ({ tabs }),
  component: Component,
});

function Component() {
  const { tabs } = Route.useLoaderData();
  const { isExpanded } = useRightPanel();

  return (
    <div className="flex flex-row gap-2 h-full">
      <Sidebar />
      <div className="flex flex-col gap-2 h-full">
        <MainHeader />
        {isExpanded
          ? (
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={75} minSize={30}>
                <MainArea tabs={tabs} />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={25} minSize={20}>
                <Chat />
              </ResizablePanel>
            </ResizablePanelGroup>
          )
          : <MainArea tabs={tabs} />}
      </div>
    </div>
  );
}

function MainArea({ tabs }: { tabs: Tab[] }) {
  const activeTab = tabs.find((t) => t.active)!;

  return (
    <div className="flex flex-col gap-2">
      <Tabs tabs={tabs} />
      <TabContent tab={activeTab} />
    </div>
  );
}

function MainHeader() {
  const { isExpanded } = useLeftSidebar();
  const isMain = getCurrentWebviewWindowLabel() === "main";

  const search = useSearch({ strict: false });
  const navigate = useNavigate();

  const handleClickSettings = () => {
    windowsCommands.windowShow({ type: "settings" });
  };

  const handleClickNewNote = () => {
    navigate({
      to: "/app/main",
      search: { ...search, new: true },
    });
  };

  return (
    <header
      data-tauri-drag-region
      className={clsx([
        "flex w-full items-center justify-between min-h-11 py-1 px-2 border-b",
        isMain
          ? "border-border bg-neutral-50"
          : "border-transparent bg-transparent",
        !isExpanded && "pl-[72px]",
      ])}
    >
      <div
        className="flex items-center justify-start"
        data-tauri-drag-region
      >
        <button
          onClick={handleClickSettings}
        >
          Setting
        </button>
        <button
          onClick={handleClickNewNote}
        >
          New note
        </button>
      </div>
    </header>
  );
}

function Tabs({ tabs }: { tabs: Tab[] }) {
  const { select, close } = useTabs();

  return (
    <div className="flex flex-row gap-2">
      {tabs.map((tab) => (
        <TabHeader
          key={tab.id}
          tab={tab}
          active={tab.active}
          handleSelect={select}
          handleClose={close}
        />
      ))}
    </div>
  );
}

function TabHeader(
  { tab, active, handleSelect, handleClose }: {
    tab: Tab;
    active: boolean;
    handleSelect: (tab: Tab) => void;
    handleClose: (tab: Tab) => void;
  },
) {
  const title = persisted.UI.useCell("sessions", tab.id, "title", persisted.STORE_ID);

  return (
    <div
      className={clsx([
        "flex items-center gap-2",
        "border border-gray-300 rounded py-0.5 px-2",
        active && "bg-blue-100",
      ])}
    >
      <button
        onClick={() => handleSelect(tab)}
        className="truncate max-w-[120px]"
      >
        {title}
      </button>
      {active && (
        <button
          onClick={() => handleClose(tab)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function TabContent({ tab }: { tab: Tab }) {
  const row = persisted.UI.useRow("sessions", tab.id, persisted.STORE_ID);

  const handleEditTitle = persisted.UI.useSetRowCallback(
    "sessions",
    tab.id,
    (input: string, _store) => ({ ...row, title: input }),
    [row],
    persisted.STORE_ID,
  );

  const handleEditRawMd = persisted.UI.useSetRowCallback(
    "sessions",
    tab.id,
    (input: string, _store) => ({ ...row, raw_md: input }),
    [row],
    persisted.STORE_ID,
  );

  return (
    <div className="flex flex-col gap-2">
      <input
        className="border border-gray-300 rounded p-2"
        type="text"
        value={row.title}
        onChange={(e) => handleEditTitle(e.target.value)}
      />
      <textarea
        className="border border-gray-300 rounded p-2"
        value={row.raw_md}
        onChange={(e) => handleEditRawMd(e.target.value)}
      />
    </div>
  );
}
