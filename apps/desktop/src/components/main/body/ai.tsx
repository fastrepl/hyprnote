import { AudioLinesIcon, SparklesIcon } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { type Tab, useTabs } from "../../../store/zustand/tabs";
import { LLM } from "../../settings/ai/llm";
import { STT } from "../../settings/ai/stt";
import { StandardTabWrapper } from "./index";
import { type TabItem, TabItemBase } from "./shared";

type AITabKey = "transcription" | "intelligence";

export const TabItemAI: TabItem<Extract<Tab, { type: "ai" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  const suffix = tab.state.tab === "transcription" ? "STT" : "LLM";

  return (
    <TabItemBase
      icon={<SparklesIcon className="w-4 h-4" />}
      title={
        <div className="flex items-center gap-1">
          <span>AI</span>
          <span className="text-xs text-neutral-400">({suffix})</span>
        </div>
      }
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentAI({ tab }: { tab: Extract<Tab, { type: "ai" }> }) {
  return (
    <StandardTabWrapper>
      <AIView tab={tab} />
    </StandardTabWrapper>
  );
}

function AIView({ tab }: { tab: Extract<Tab, { type: "ai" }> }) {
  const updateAiTabState = useTabs((state) => state.updateAiTabState);
  const activeTab = tab.state.tab;

  const setActiveTab = useCallback(
    (newTab: AITabKey) => {
      updateAiTabState(tab, { tab: newTab });
    },
    [updateAiTabState, tab],
  );

  const headerAction = (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setActiveTab("transcription")}
        className={cn([
          "gap-1.5 h-7 px-2",
          activeTab === "transcription" && "bg-neutral-200",
        ])}
      >
        <AudioLinesIcon size={14} />
        <span className="text-xs">Transcription</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setActiveTab("intelligence")}
        className={cn([
          "gap-1.5 h-7 px-2",
          activeTab === "intelligence" && "bg-neutral-200",
        ])}
      >
        <SparklesIcon size={14} />
        <span className="text-xs">Intelligence</span>
      </Button>
    </div>
  );

  return (
    <div className="flex-1 w-full overflow-y-auto scrollbar-hide p-6">
      {activeTab === "transcription" ? (
        <STT headerAction={headerAction} />
      ) : (
        <LLM headerAction={headerAction} />
      )}
    </div>
  );
}
