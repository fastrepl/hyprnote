import { MessageSquareIcon } from "lucide-react";
import { useCallback } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";

import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { ChatShortcutDetailsColumn } from "./details";
import { ChatShortcutsListColumn } from "./list";

export const TabItemChatShortcut: TabItem<
  Extract<Tab, { type: "chat_shortcuts" }>
> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  return (
    <TabItemBase
      icon={<MessageSquareIcon className="w-4 h-4" />}
      title={"Chat Shortcuts"}
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentChatShortcut({
  tab,
}: {
  tab: Extract<Tab, { type: "chat_shortcuts" }>;
}) {
  return (
    <StandardTabWrapper>
      <ChatShortcutView tab={tab} />
    </StandardTabWrapper>
  );
}

function ChatShortcutView({
  tab,
}: {
  tab: Extract<Tab, { type: "chat_shortcuts" }>;
}) {
  const updateChatShortcutsTabState = useTabs(
    (state) => state.updateChatShortcutsTabState,
  );

  const { selectedChatShortcut } = tab.state;

  const setSelectedChatShortcut = useCallback(
    (value: string | null) => {
      updateChatShortcutsTabState(tab, {
        ...tab.state,
        selectedChatShortcut: value,
      });
    },
    [updateChatShortcutsTabState, tab],
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
        <ChatShortcutsListColumn
          selectedChatShortcut={selectedChatShortcut}
          setSelectedChatShortcut={setSelectedChatShortcut}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70} minSize={50}>
        <ChatShortcutDetailsColumn
          selectedChatShortcutId={selectedChatShortcut}
          setSelectedChatShortcut={setSelectedChatShortcut}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
