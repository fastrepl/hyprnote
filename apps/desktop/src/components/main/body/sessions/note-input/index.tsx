import { useEffect, useRef } from "react";

import type { TiptapEditor } from "@hypr/tiptap/editor";
import { cn } from "@hypr/utils";
import { useAutoEnhance } from "../../../../../hooks/useAutoEnhance";
import { useAutoTitle } from "../../../../../hooks/useAutoTitle";
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
  useAutoTitle(tab);

  const handleTabChange = (view: EditorView) => {
    updateSessionTabState(tab, { editor: view });
  };

  const currentTab: EditorView = useCurrentNoteTab(tab);

  useEffect(() => {
    if (currentTab === "transcript" && editorRef.current) {
      editorRef.current = { editor: null };
    }
  }, [currentTab]);

  const handleContainerClick = () => {
    if (currentTab !== "transcript") {
      editorRef.current?.editor?.commands.focus();
    }
  };

  return (
    <div className="flex flex-col h-full -mx-2">
      <div className="px-2">
        <Header
          sessionId={sessionId}
          editorTabs={editorTabs}
          currentTab={currentTab}
          handleTabChange={handleTabChange}
        />
      </div>

      <div
        onClick={handleContainerClick}
        className={cn([
          "flex-1 mt-1",
          currentTab === "transcript" ? "overflow-hidden" : ["overflow-auto", "pb-8", "px-2"],
        ])}
      >
        {currentTab === "enhanced" && <Enhanced ref={editorRef} sessionId={sessionId} />}
        {currentTab === "raw" && <RawEditor ref={editorRef} sessionId={sessionId} />}
        {currentTab === "transcript" && <Transcript sessionId={sessionId} />}
      </div>
    </div>
  );
}
