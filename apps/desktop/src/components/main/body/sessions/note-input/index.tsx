import { useRef } from "react";

import type { TiptapEditor } from "@hypr/tiptap/editor";
import { cn } from "@hypr/utils";
import { useAutoEnhance } from "../../../../../hooks/useAutoEnhance";
import { type Tab, useTabs } from "../../../../../store/zustand/tabs";
import { type EditorView } from "../../../../../store/zustand/tabs/schema";
import { useCurrentNoteTab } from "../shared";
import { Enhanced } from "./enhanced";
import { Header, useEditorTabs } from "./header";
import { RawEditor } from "./raw";
import { Transcript } from "./transcript";

export function NoteInput({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const editorTabs = useEditorTabs({ sessionId: tab.id });
  const { updateSessionTabState } = useTabs();
  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);

  const sessionId = tab.id;
  useAutoEnhance(tab);

  const handleTabChange = (view: EditorView) => {
    updateSessionTabState(tab, { editor: view });
  };

  const handleContainerClick = () => {
    editorRef.current?.editor?.commands.focus();
  };

  const currentTab: EditorView = useCurrentNoteTab(tab);

  return (
    <div className="flex flex-col h-full">
      <Header
        sessionId={sessionId}
        editorTabs={editorTabs}
        currentTab={currentTab}
        handleTabChange={handleTabChange}
      />

      <div
        onClick={handleContainerClick}
        className={cn([
          "flex-1 mt-3",
          currentTab === "transcript" ? "overflow-hidden" : ["overflow-auto", "pb-8"],
        ])}
      >
        {currentTab === "enhanced" && <Enhanced ref={editorRef} sessionId={sessionId} />}
        {currentTab === "raw" && <RawEditor ref={editorRef} sessionId={sessionId} />}
        {currentTab === "transcript" && <Transcript sessionId={sessionId} />}
      </div>
    </div>
  );
}
