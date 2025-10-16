import { cn } from "@hypr/ui/lib/utils";
import { motion } from "motion/react";
import { type Tab, useTabs } from "../../../../../store/zustand/tabs";
import { EnhancedEditor } from "./enhanced";
import { RawEditor } from "./raw";
import { TranscriptEditorWrapper } from "./transcript";

type EditorView = "raw" | "enhanced" | "transcript";

const tabs = [
  { id: "enhanced", label: "Summary" },
  { id: "raw", label: "Memo" },
  { id: "transcript", label: "Transcript" },
] as const;

export function NoteInput({ tab }: { tab: Tab }) {
  const { updateSessionTabState } = useTabs();

  const handleTabChange = (view: EditorView) => {
    updateSessionTabState(tab, { editor: view });
  };

  if (tab.type !== "sessions") {
    return null;
  }

  const sessionId = tab.id;
  const currentTab = tab.state.editor ?? "raw";

  return (
    <div className="flex flex-col h-full">
      <div className="relative bg-white">
        <div className="flex border-b border-neutral-100">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id as EditorView)}
              className={cn([
                "relative px-4 py-2 text-xs font-medium transition-colors duration-200 flex items-center",
                currentTab === t.id
                  ? ["text-neutral-900"]
                  : ["text-neutral-600", "hover:text-neutral-800"],
              ])}
            >
              {currentTab === t.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-neutral-900"
                  transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                />
              )}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="py-1" />
      <div className="flex-1 overflow-auto">
        {currentTab === "enhanced" && <EnhancedEditor sessionId={sessionId} />}
        {currentTab === "raw" && <RawEditor sessionId={sessionId} />}
        {currentTab === "transcript" && <TranscriptEditorWrapper sessionId={sessionId} />}
      </div>
    </div>
  );
}
