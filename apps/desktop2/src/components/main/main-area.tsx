import { commands as windowsCommands } from "@hypr/plugin-windows";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { clsx } from "clsx";

import { useTabs } from "../../hooks/useTabs";
import * as persisted from "../../tinybase/store/persisted";
import { Tab } from "../../types";

export function MainContent({ tabs }: { tabs: Tab[] }) {
  const activeTab = tabs.find((t) => t.active)!;

  return (
    <div className="flex flex-col gap-2">
      <Tabs tabs={tabs} />
      <TabContent tab={activeTab} />
    </div>
  );
}

export function MainHeader() {
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
        "border-border bg-neutral-50",
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
