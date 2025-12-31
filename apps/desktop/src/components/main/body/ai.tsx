import { AudioLinesIcon, SparklesIcon } from "lucide-react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useResizeObserver } from "usehooks-ts";

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
  handlePinThis,
  handleUnpinThis,
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
  const { ref, atStart, atEnd } = useScrollFade<HTMLDivElement>([activeTab]);

  const scrollPositions = useRef<Record<AITabKey, number>>({
    transcription: 0,
    intelligence: 0,
  });
  const previousTab = useRef<AITabKey>(activeTab);

  useEffect(() => {
    if (previousTab.current !== activeTab && ref.current) {
      ref.current.scrollTop = scrollPositions.current[activeTab];
    }
    previousTab.current = activeTab;
  }, [activeTab, ref]);

  const setActiveTab = useCallback(
    (newTab: AITabKey) => {
      if (ref.current) {
        scrollPositions.current[activeTab] = ref.current.scrollTop;
      }
      updateAiTabState(tab, { tab: newTab });
    },
    [updateAiTabState, tab, activeTab, ref],
  );

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
          ref={ref}
          className="flex-1 w-full h-full overflow-y-auto scrollbar-hide px-6 pb-6"
        >
          {activeTab === "transcription" ? <STT /> : <LLM />}
        </div>
        {!atStart && <ScrollFadeOverlay position="top" />}
        {!atEnd && <ScrollFadeOverlay position="bottom" />}
      </div>
    </div>
  );
}

function useScrollFade<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  const [state, setState] = useState({ atStart: true, atEnd: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    setState({
      atStart: scrollTop <= 1,
      atEnd: scrollTop + clientHeight >= scrollHeight - 1,
    });
  }, []);

  useResizeObserver({ ref: ref as RefObject<T>, onResize: update });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    update();
    el.addEventListener("scroll", update);
    return () => el.removeEventListener("scroll", update);
  }, [update, ...deps]);

  return { ref, ...state };
}

function ScrollFadeOverlay({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      className={cn([
        "absolute left-0 w-full h-8 z-20 pointer-events-none",
        position === "top" &&
          "top-0 bg-gradient-to-b from-white to-transparent",
        position === "bottom" &&
          "bottom-0 bg-gradient-to-t from-white to-transparent",
      ])}
    />
  );
}
