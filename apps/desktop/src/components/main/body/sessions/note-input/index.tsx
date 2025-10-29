import { useRef } from "react";

import type { TiptapEditor } from "@hypr/tiptap/editor";
import { cn } from "@hypr/utils";
import { useListener } from "../../../../../contexts/listener";
import { useAutoEnhance } from "../../../../../hooks/useAutoEnhance";
import { useAutoGenerateTitle } from "../../../../../hooks/useAutoGenerateTitle";
import { type Tab, useTabs } from "../../../../../store/zustand/tabs";
import { type EditorView } from "../../../../../store/zustand/tabs/schema";
import { useCurrentTab, useHasTranscript } from "../shared";
import { Enhanced } from "./enhanced";
import { RawEditor } from "./raw";
import { Transcript } from "./transcript";

export function NoteInput({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const editorTabs = useEditorTabs({ sessionId: tab.id });
  const { updateSessionTabState } = useTabs();
  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);

  const sessionId = tab.id;
  useAutoEnhance(tab);
  useAutoGenerateTitle(tab);

  const handleTabChange = (view: EditorView) => {
    updateSessionTabState(tab, { editor: view });
  };

  const handleContainerClick = () => {
    editorRef.current?.editor?.commands.focus();
  };

  const currentTab: EditorView = useCurrentTab(tab);

  return (
    <div className="flex flex-col h-full">
      <Header editorTabs={editorTabs} currentTab={currentTab} handleTabChange={handleTabChange} />
      <div
        className={cn([
          "flex-1",
          "mt-3",
          currentTab === "transcript" ? "overflow-hidden" : ["overflow-auto", "pb-8"],
        ])}
        onClick={handleContainerClick}
      >
        {currentTab === "enhanced" && <Enhanced ref={editorRef} sessionId={sessionId} />}
        {currentTab === "raw" && <RawEditor ref={editorRef} sessionId={sessionId} />}
        {currentTab === "transcript" && <Transcript sessionId={sessionId} />}
      </div>
    </div>
  );
}

function Header(
  {
    editorTabs,
    currentTab,
    handleTabChange,
  }: {
    editorTabs: EditorView[];
    currentTab: EditorView;
    handleTabChange: (view: EditorView) => void;
  },
) {
  if (editorTabs.length === 1 && editorTabs[0] === "raw") {
    return null;
  }

  return (
    <div className="flex gap-1">
      {editorTabs.map((view) => (
        <button
          key={view}
          onClick={() => handleTabChange(view)}
          className={cn([
            "relative my-2 py-0.5 px-1 text-xs font-medium transition-all duration-200 border-b-2",
            currentTab === view
              ? ["text-neutral-900", "border-neutral-900"]
              : ["text-neutral-600", "border-transparent", "hover:text-neutral-800"],
          ])}
        >
          {labelForEditorView(view)}
        </button>
      ))}
    </div>
  );
}

function useEditorTabs({ sessionId }: { sessionId: string }): EditorView[] {
  const { status, sessionId: activeSessionId } = useListener((state) => ({
    status: state.status,
    sessionId: state.sessionId,
  }));
  const hasTranscript = useHasTranscript(sessionId);

  if (status === "running_active" && activeSessionId === sessionId) {
    return ["raw", "transcript"];
  }

  if (hasTranscript) {
    return ["enhanced", "raw", "transcript"];
  }

  return ["raw"];
}

function labelForEditorView(view: EditorView): string {
  if (view === "enhanced") {
    return "Summary";
  }
  if (view === "raw") {
    return "Memos";
  }
  if (view === "transcript") {
    return "Transcript";
  }
  return "";
}
