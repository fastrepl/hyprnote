import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PanelLeftOpenIcon,
  PlusIcon,
} from "lucide-react";
import { Reorder } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useShallow } from "zustand/shallow";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { useShell } from "../../../contexts/shell";
import { useIsLinux } from "../../../hooks/usePlatform";
import {
  type Tab,
  uniqueIdfromTab,
  useTabs,
} from "../../../store/zustand/tabs";
import { ChatFloatingButton } from "../../chat";
import { TrafficLights } from "../../window/traffic-lights";
import { useNewNote } from "../shared";
import { TabContentContact, TabItemContact } from "./contacts";
import { TabContentEmpty, TabItemEmpty } from "./empty";
import { TabContentEvent, TabItemEvent } from "./events";
import { TabContentExtension, TabItemExtension } from "./extensions";
import { loadExtensionPanels } from "./extensions/registry";
import { TabContentFolder, TabItemFolder } from "./folders";
import { TabContentHuman, TabItemHuman } from "./humans";
import { Search } from "./search";
import { TabContentNote, TabItemNote } from "./sessions";

export function Body() {
  const { tabs, currentTab } = useTabs(
    useShallow((state) => ({
      tabs: state.tabs,
      currentTab: state.currentTab,
    })),
  );

  useEffect(() => {
    loadExtensionPanels();
  }, []);

  if (!currentTab) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 h-full flex-1 relative">
      <Header tabs={tabs} />
      <div className="flex-1 overflow-auto">
        <ContentWrapper key={uniqueIdfromTab(currentTab)} tab={currentTab} />
      </div>
    </div>
  );
}

function Header({ tabs }: { tabs: Tab[] }) {
  const { leftsidebar } = useShell();
  const isLinux = useIsLinux();
  const {
    select,
    close,
    reorder,
    goBack,
    goNext,
    canGoBack,
    canGoNext,
    closeOthers,
    closeAll,
  } = useTabs(
    useShallow((state) => ({
      select: state.select,
      close: state.close,
      reorder: state.reorder,
      goBack: state.goBack,
      goNext: state.goNext,
      canGoBack: state.canGoBack,
      canGoNext: state.canGoNext,
      closeOthers: state.closeOthers,
      closeAll: state.closeAll,
    })),
  );
  const tabsScrollContainerRef = useRef<HTMLDivElement>(null);
  const handleNewEmptyTab = useNewEmptyTab();

  const setTabRef = useScrollActiveTabIntoView(tabs);
  useTabsShortcuts();

  return (
    <div
      data-tauri-drag-region
      className={cn([
        "w-full h-9 flex items-center",
        !leftsidebar.expanded && (isLinux ? "pl-3" : "pl-[72px]"),
      ])}
    >
      {!leftsidebar.expanded && isLinux && <TrafficLights className="mr-2" />}
      {!leftsidebar.expanded && (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => leftsidebar.setExpanded(true)}
        >
          <PanelLeftOpenIcon size={16} className="text-neutral-600" />
        </Button>
      )}

      <div className="flex items-center h-full shrink-0">
        <Button
          onClick={goBack}
          disabled={!canGoBack}
          variant="ghost"
          size="icon"
        >
          <ArrowLeftIcon size={16} />
        </Button>
        <Button
          onClick={goNext}
          disabled={!canGoNext}
          variant="ghost"
          size="icon"
        >
          <ArrowRightIcon size={16} />
        </Button>
      </div>

      <div
        ref={tabsScrollContainerRef}
        data-tauri-drag-region
        className={cn([
          "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
          "w-fit overflow-x-auto overflow-y-hidden h-full",
        ])}
      >
        <Reorder.Group
          key={leftsidebar.expanded ? "expanded" : "collapsed"}
          as="div"
          axis="x"
          values={tabs}
          onReorder={reorder}
          className="flex w-max gap-1 h-full"
        >
          {tabs.map((tab, index) => {
            const isLastTab = index === tabs.length - 1;
            const shortcutIndex =
              index < 8 ? index + 1 : isLastTab ? 9 : undefined;

            return (
              <Reorder.Item
                key={uniqueIdfromTab(tab)}
                value={tab}
                as="div"
                ref={(el) => setTabRef(tab, el)}
                style={{ position: "relative" }}
                className="h-full z-10"
                layoutScroll
              >
                <TabItem
                  tab={tab}
                  handleClose={close}
                  handleSelect={select}
                  handleCloseOthersCallback={closeOthers}
                  handleCloseAll={closeAll}
                  tabIndex={shortcutIndex}
                />
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </div>

      <div
        data-tauri-drag-region
        className="flex-1 flex h-full items-center justify-between"
      >
        <Button
          onClick={handleNewEmptyTab}
          variant="ghost"
          size="icon"
          className="text-neutral-600"
        >
          <PlusIcon size={16} />
        </Button>

        <Search />
      </div>
    </div>
  );
}

function TabItem({
  tab,
  handleClose,
  handleSelect,
  handleCloseOthersCallback,
  handleCloseAll,
  tabIndex,
}: {
  tab: Tab;
  handleClose: (tab: Tab) => void;
  handleSelect: (tab: Tab) => void;
  handleCloseOthersCallback: (tab: Tab) => void;
  handleCloseAll: () => void;
  tabIndex?: number;
}) {
  const handleCloseOthers = () => handleCloseOthersCallback(tab);

  if (tab.type === "sessions") {
    return (
      <TabItemNote
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
      />
    );
  }
  if (tab.type === "events") {
    return (
      <TabItemEvent
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
      />
    );
  }
  if (tab.type === "folders") {
    return (
      <TabItemFolder
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
      />
    );
  }
  if (tab.type === "humans") {
    return (
      <TabItemHuman
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
      />
    );
  }
  if (tab.type === "contacts") {
    return (
      <TabItemContact
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
      />
    );
  }
  if (tab.type === "empty") {
    return (
      <TabItemEmpty
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
      />
    );
  }
  if (tab.type === "extension") {
    return (
      <TabItemExtension
        tab={tab}
        tabIndex={tabIndex}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
      />
    );
  }

  return null;
}

function ContentWrapper({ tab }: { tab: Tab }) {
  if (tab.type === "sessions") {
    return <TabContentNote tab={tab} />;
  }
  if (tab.type === "events") {
    return <TabContentEvent tab={tab} />;
  }
  if (tab.type === "folders") {
    return <TabContentFolder tab={tab} />;
  }
  if (tab.type === "humans") {
    return <TabContentHuman tab={tab} />;
  }
  if (tab.type === "contacts") {
    return <TabContentContact tab={tab} />;
  }
  if (tab.type === "empty") {
    return <TabContentEmpty tab={tab} />;
  }
  if (tab.type === "extension") {
    return <TabContentExtension tab={tab} />;
  }

  return null;
}

function TabChatButton() {
  const { chat } = useShell();

  if (chat.mode === "RightPanelOpen") {
    return null;
  }

  return <ChatFloatingButton />;
}

export function StandardTabWrapper({
  children,
  afterBorder,
  floatingButton,
}: {
  children: React.ReactNode;
  afterBorder?: React.ReactNode;
  floatingButton?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col rounded-xl border border-neutral-200 flex-1 overflow-hidden relative">
        {children}
        {floatingButton}
        <TabChatButton />
      </div>
      {afterBorder}
    </div>
  );
}

function useScrollActiveTabIntoView(tabs: Tab[]) {
  const tabRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const activeTab = tabs.find((tab) => tab.active);
    if (activeTab) {
      const tabKey = uniqueIdfromTab(activeTab);
      const tabElement = tabRefsMap.current.get(tabKey);
      if (tabElement) {
        tabElement.scrollIntoView({
          behavior: "smooth",
          inline: "nearest",
          block: "nearest",
        });
      }
    }
  }, [tabs]);

  const setTabRef = useCallback((tab: Tab, el: HTMLDivElement | null) => {
    if (el) {
      tabRefsMap.current.set(uniqueIdfromTab(tab), el);
    } else {
      tabRefsMap.current.delete(uniqueIdfromTab(tab));
    }
  }, []);

  return setTabRef;
}

function useTabsShortcuts() {
  const { tabs, currentTab, close, select } = useTabs(
    useShallow((state) => ({
      tabs: state.tabs,
      currentTab: state.currentTab,
      close: state.close,
      select: state.select,
    })),
  );
  const newNote = useNewNote({ behavior: "new" });
  const newNoteCurrent = useNewNote({ behavior: "current" });
  const newEmptyTab = useNewEmptyTab();

  useHotkeys(
    "mod+n",
    () => {
      if (currentTab?.type === "empty") {
        newNoteCurrent();
      } else {
        newNote();
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [currentTab, newNote, newNoteCurrent],
  );

  useHotkeys(
    "mod+t",
    () => newEmptyTab(),
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [newEmptyTab],
  );

  useHotkeys(
    "mod+w",
    async () => {
      if (currentTab) {
        close(currentTab);
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [currentTab, close],
  );

  useHotkeys(
    "mod+1, mod+2, mod+3, mod+4, mod+5, mod+6, mod+7, mod+8, mod+9",
    (event) => {
      const key = event.key;
      const targetIndex =
        key === "9" ? tabs.length - 1 : Number.parseInt(key, 10) - 1;
      const target = tabs[targetIndex];
      if (target) {
        select(target);
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [tabs, select],
  );

  return {};
}

function useNewEmptyTab() {
  const openNew = useTabs((state) => state.openNew);

  const handler = useCallback(() => {
    openNew({ type: "empty" });
  }, [openNew]);

  return handler;
}
