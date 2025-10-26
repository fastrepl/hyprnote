import { useMemo, useRef } from "react";

import type { TiptapEditor } from "@hypr/tiptap/editor";
import { cn } from "@hypr/utils";
import { useListener } from "../../../../../contexts/listener";
import * as persisted from "../../../../../store/tinybase/persisted";
import { type Tab, useTabs } from "../../../../../store/zustand/tabs";
import { type EditorView } from "../../../../../store/zustand/tabs/schema";
import { Enhanced } from "./enhanced";
import { RawEditor } from "./raw";
import { Transcript } from "./transcript";

export function NoteInput({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const editorTabs = useEditorTabs({ sessionId: tab.id });
  const { updateSessionTabState } = useTabs();
  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);

  const hasTranscript = useHasTranscript(tab.id);

  const handleTabChange = (view: EditorView) => {
    updateSessionTabState(tab, { editor: view });
  };

  const handleContainerClick = () => {
    editorRef.current?.editor?.commands.focus();
  };

  const sessionId = tab.id;
  const currentTab = useMemo(
    () => tab.state.editor ?? (hasTranscript ? "enhanced" : "raw"),
    [tab.state.editor, hasTranscript],
  );

  return (
    <div className="flex flex-col h-full">
      <Header editorTabs={editorTabs} currentTab={currentTab} handleTabChange={handleTabChange} />
      <div className="flex-1 overflow-auto mt-3" onClick={handleContainerClick}>
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
    <div className="flex gap-4">
      {editorTabs.map((view) => (
        <button
          key={view}
          onClick={() => handleTabChange(view)}
          className={cn([
            "relative py-2 text-xs font-medium transition-all duration-200 border-b-2 -mb-px",
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
  const status = useListener((state) => state.status);
  const hasTranscript = useHasTranscript(sessionId);

  if (status === "running_active") {
    return ["raw", "transcript"];
  }

  if (hasTranscript) {
    return ["enhanced", "raw", "transcript"];
  }

  return ["raw"];
}

function useHasTranscript(sessionId: string): boolean {
  const transcriptIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.transcriptBySession,
    sessionId,
    persisted.STORE_ID,
  );

  return !!transcriptIds && transcriptIds.length > 0;
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
