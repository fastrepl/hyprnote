import { cn } from "@hypr/ui/lib/utils";
import { type Tab, useTabs } from "../../../../../store/zustand/tabs";
import { EnhancedEditor } from "./enhanced";
import { RawEditor } from "./raw";
import { TranscriptEditorWrapper } from "./transcript";

type EditorView = "raw" | "enhanced" | "transcript";

const EDITOR_TABS = [
  { view: "enhanced" as const, label: "Summary" },
  { view: "raw" as const, label: "Memos" },
  { view: "transcript" as const, label: "Transcript" },
];

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
      <div className="bg-white border-b border-neutral-100">
        <div className="flex">
          {EDITOR_TABS.map(({ view, label }) => (
            <button
              key={view}
              onClick={() => handleTabChange(view)}
              className={cn([
                "relative px-3 py-2 text-xs font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                currentTab === view
                  ? ["text-neutral-900", "border-neutral-900"]
                  : ["text-neutral-600", "border-transparent", "hover:text-neutral-800"],
              ])}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto mt-1">
        {currentTab === "enhanced" && <EnhancedEditor sessionId={sessionId} />}
        {currentTab === "raw" && <RawEditor sessionId={sessionId} />}
        {currentTab === "transcript" && <TranscriptEditorWrapper sessionId={sessionId} />}
      </div>
    </div>
  );
}
