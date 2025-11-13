import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

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

export function NoteInput({
  tab,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
}) {
  const editorTabs = useEditorTabs({ sessionId: tab.id });
  const updateSessionTabState = useTabs((state) => state.updateSessionTabState);
  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);
  const inactive = useListener((state) => state.live.status === "inactive");
  const [isEditing, setIsEditing] = useState(false);

  const sessionId = tab.id;
  useAutoEnhance(tab);
  useAutoTitle(tab);

  const handleTabChange = (view: EditorView) => {
    updateSessionTabState(tab, { editor: view });
  };

  const currentTab: EditorView = useCurrentNoteTab(tab);

  useTabShortcuts({
    editorTabs,
    currentTab,
    handleTabChange,
  });

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
          isEditing={isEditing}
          setIsEditing={setIsEditing}
        />
      </div>

      <div
        onClick={handleContainerClick}
        className={cn([
          "flex-1 mt-2 px-3",
          currentTab === "transcript"
            ? "overflow-hidden"
            : ["overflow-auto", "pb-6"],
        ])}
      >
        {currentTab === "enhanced" && (
          <Enhanced ref={editorRef} sessionId={sessionId} />
        )}
        {currentTab === "raw" && (
          <RawEditor ref={editorRef} sessionId={sessionId} />
        )}
        {currentTab === "transcript" && (
          <Transcript sessionId={sessionId} isEditing={isEditing} />
        )}
      </div>
    </div>
  );
}

function useTabShortcuts({
  editorTabs,
  currentTab,
  handleTabChange,
}: {
  editorTabs: EditorView[];
  currentTab: EditorView;
  handleTabChange: (view: EditorView) => void;
}) {
  const switchToTab = useCallback(
    (targetTab: EditorView) => {
      if (editorTabs.includes(targetTab) && currentTab !== targetTab) {
        handleTabChange(targetTab);
      }
    },
    [currentTab, editorTabs, handleTabChange],
  );

  useHotkeys(
    "alt+s",
    () => {
      switchToTab("enhanced");
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [switchToTab],
  );

  useHotkeys(
    "alt+m",
    () => {
      switchToTab("raw");
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [switchToTab],
  );

  useHotkeys(
    "alt+t",
    () => {
      switchToTab("transcript");
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [switchToTab],
  );
}
