import { useEffect, useRef, useState } from "react";

import type { TiptapEditor } from "@hypr/tiptap/editor";
import { cn } from "@hypr/utils";
import { useListener } from "../../../../../contexts/listener";
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
  const [isEditing] = useState(false);
  const inactive = useListener((state) => state.live.status === "inactive");

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
          isInactive={inactive}
        />
      </div>

      <div
        onClick={handleContainerClick}
        className={cn([
          "flex-1 mt-2 px-3",
          currentTab === "transcript" ? "overflow-hidden" : ["overflow-auto", "pb-6"],
        ])}
      >
        {currentTab === "enhanced" && <Enhanced ref={editorRef} sessionId={sessionId} />}
        {currentTab === "raw" && <RawEditor ref={editorRef} sessionId={sessionId} />}
        {currentTab === "transcript" && <Transcript sessionId={sessionId} isEditing={isEditing} />}
      </div>
    </div>
  );
}
