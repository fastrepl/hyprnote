import { cn } from "@hypr/ui/lib/utils";
import { type Tab, useTabs } from "../../../../../store/zustand/tabs";
import { EnhancedEditor } from "./enhanced";
import { RawEditor } from "./raw";
import { TranscriptEditorWrapper } from "./transcript";

type EditorView = "raw" | "enhanced" | "transcript";

export function NoteInput({
  tab,
}: {
  tab: Tab;
}) {
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
      <div className="relative">
        <div className="bg-white">
          <div className="flex">
            <div className="flex border-b border-neutral-100 w-full">
              <button
                onClick={() => handleTabChange("enhanced")}
                className={cn([
                  "relative px-2 py-2 text-xs pl-1 font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                  currentTab === "enhanced"
                    ? ["text-neutral-900", "border-neutral-900"]
                    : ["text-neutral-600", "border-transparent", "hover:text-neutral-800"],
                ])}
              >
                Summary
              </button>

              <button
                onClick={() => handleTabChange("raw")}
                className={cn([
                  "relative px-2 py-2 text-xs pl-1 font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                  currentTab === "raw"
                    ? ["text-neutral-900", "border-neutral-900"]
                    : ["text-neutral-600", "border-transparent", "hover:text-neutral-800"],
                ])}
              >
                Memos
              </button>

              <button
                onClick={() => handleTabChange("transcript")}
                className={cn([
                  "relative px-4 py-2 text-xs pl-3 font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                  currentTab === "transcript"
                    ? ["text-neutral-900", "border-neutral-900"]
                    : ["text-neutral-600", "border-transparent", "hover:text-neutral-800"],
                ])}
              >
                Transcript
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-1"></div>
      <div className="flex-1 overflow-auto">
        {currentTab === "enhanced" && <EnhancedEditor sessionId={sessionId} />}
        {currentTab === "raw" && <RawEditor sessionId={sessionId} />}
        {currentTab === "transcript" && <TranscriptEditorWrapper sessionId={sessionId} />}
      </div>
    </div>
  );
}
