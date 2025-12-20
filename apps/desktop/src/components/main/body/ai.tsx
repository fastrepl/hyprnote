import { AudioLinesIcon, SparklesIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const activeTab = tab.state.tab ?? "transcription";
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    atStart: true,
    atEnd: true,
  });

  const setActiveTab = useCallback(
    (newTab: AITabKey) => {
      updateAiTabState(tab, { tab: newTab });
    },
    [updateAiTabState, tab],
  );

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const atStart = scrollTop <= 1;
    const atEnd = scrollTop + clientHeight >= scrollHeight - 1;
    setScrollState({ atStart, atEnd });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollState();
    container.addEventListener("scroll", updateScrollState);
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState, activeTab]);

  return (
    <div className="flex flex-col flex-1 w-full overflow-hidden">
      <div className="flex gap-1 px-6 pt-6 pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab("transcription")}
          className={cn([
            "px-1 gap-1.5 h-7 border border-transparent",
            activeTab === "transcription" &&
              "bg-neutral-100 border-neutral-200",
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
            "px-1 gap-1.5 h-7 border border-transparent",
            activeTab === "intelligence" && "bg-neutral-100 border-neutral-200",
          ])}
        >
          <SparklesIcon size={14} />
          <span className="text-xs">Intelligence</span>
        </Button>
      </div>
      <div className="relative flex-1 w-full overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex-1 w-full h-full overflow-y-auto scrollbar-hide px-6 pb-6"
        >
          {activeTab === "transcription" ? <STT /> : <LLM />}
        </div>
        {!scrollState.atStart && (
          <div className="absolute left-0 top-0 w-full h-8 z-20 pointer-events-none bg-gradient-to-b from-white to-transparent" />
        )}
        {!scrollState.atEnd && (
          <div className="absolute left-0 bottom-0 w-full h-8 z-20 pointer-events-none bg-gradient-to-t from-white to-transparent" />
        )}
      </div>
    </div>
  );
}
