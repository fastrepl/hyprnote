import { SparklesIcon } from "lucide-react";
import { useCallback } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";

import type { TaskType } from "../../../../store/tinybase/prompts";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { PromptDetailsColumn } from "./details";
import { PromptsListColumn } from "./list";

export const TabItemPrompt: TabItem<Extract<Tab, { type: "prompts" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  return (
    <TabItemBase
      icon={<SparklesIcon className="w-4 h-4" />}
      title={"Prompts"}
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentPrompt({
  tab,
}: {
  tab: Extract<Tab, { type: "prompts" }>;
}) {
  return (
    <StandardTabWrapper>
      <PromptView tab={tab} />
    </StandardTabWrapper>
  );
}

function PromptView({ tab }: { tab: Extract<Tab, { type: "prompts" }> }) {
  const updatePromptsTabState = useTabs((state) => state.updatePromptsTabState);

  const { selectedTask } = tab.state;

  const setSelectedTask = useCallback(
    (value: string | null) => {
      updatePromptsTabState(tab, {
        ...tab.state,
        selectedTask: value,
      });
    },
    [updatePromptsTabState, tab],
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
        <PromptsListColumn
          selectedTask={selectedTask as TaskType | null}
          setSelectedTask={setSelectedTask}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70} minSize={50}>
        <PromptDetailsColumn selectedTask={selectedTask as TaskType | null} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
