import { useQuery } from "@tanstack/react-query";
import { convertFileSrc } from "@tauri-apps/api/core";
import { StickyNoteIcon } from "lucide-react";
import React from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";

import AudioPlayer from "../../../../contexts/audio-player";
import { useListener } from "../../../../contexts/listener";
import { useIsSessionEnhancing } from "../../../../hooks/useEnhancedNotes";
import * as main from "../../../../store/tinybase/main";
import { rowIdfromTab, type Tab } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { CaretPositionProvider } from "./caret-position-context";
import { FloatingActionButton } from "./floating";
import { NoteInput } from "./note-input";
import { SearchBar } from "./note-input/transcript/search-bar";
import {
  SearchProvider,
  useTranscriptSearch,
} from "./note-input/transcript/search-context";
import { OuterHeader } from "./outer-header";
import { TitleInput } from "./title-input";

export const TabItemNote: TabItem<Extract<Tab, { type: "sessions" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  const title = main.UI.useCell(
    "sessions",
    rowIdfromTab(tab),
    "title",
    main.STORE_ID,
  );
  const sessionMode = useListener((state) => state.getSessionMode(tab.id));
  const isEnhancing = useIsSessionEnhancing(tab.id);
  const isActive = sessionMode === "active" || sessionMode === "finalizing";
  const isFinalizing = sessionMode === "finalizing";
  const showSpinner = isFinalizing || isEnhancing;

  return (
    <TabItemBase
      icon={<StickyNoteIcon className="w-4 h-4" />}
      title={title || "Untitled"}
      selected={tab.active}
      active={isActive}
      finalizing={showSpinner}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentNote({
  tab,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
}) {
  const listenerStatus = useListener((state) => state.live.status);
  const { data: audioUrl } = useQuery({
    enabled: listenerStatus === "inactive",
    queryKey: ["audio", tab.id, "url"],
    queryFn: () => miscCommands.audioPath(tab.id),
    select: (result) => {
      if (result.status === "error") {
        return null;
      }
      return convertFileSrc(result.data);
    },
  });

  const showTimeline =
    tab.state.view?.type === "transcript" &&
    Boolean(audioUrl) &&
    listenerStatus === "inactive";

  return (
    <CaretPositionProvider>
      <SearchProvider>
        <AudioPlayer.Provider sessionId={tab.id} url={audioUrl ?? ""}>
          <TabContentNoteInner tab={tab} showTimeline={showTimeline} />
        </AudioPlayer.Provider>
      </SearchProvider>
    </CaretPositionProvider>
  );
}

function TabContentNoteInner({
  tab,
  showTimeline,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
  showTimeline: boolean;
}) {
  const search = useTranscriptSearch();
  const showSearchBar = search?.isVisible ?? false;
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const noteInputRef = React.useRef<{
    editor: import("@hypr/tiptap/editor").TiptapEditor | null;
  }>(null);

  const focusTitle = React.useCallback(() => {
    titleInputRef.current?.focus();
  }, []);

  const focusEditor = React.useCallback(() => {
    noteInputRef.current?.editor?.commands.focus();
  }, []);

  return (
    <StandardTabWrapper
      afterBorder={showTimeline && <AudioPlayer.Timeline />}
      floatingButton={<FloatingActionButton tab={tab} />}
    >
      <div className="flex flex-col h-full">
        <div className="pl-2 pr-1">
          {showSearchBar ? <SearchBar /> : <OuterHeader sessionId={tab.id} />}
        </div>
        <div className="mt-2 px-3 shrink-0">
          <TitleInput
            ref={titleInputRef}
            tab={tab}
            onNavigateToEditor={focusEditor}
          />
        </div>
        <div className="mt-2 px-2 flex-1 min-h-0">
          <NoteInput
            ref={noteInputRef}
            tab={tab}
            onNavigateToTitle={focusTitle}
          />
        </div>
      </div>
    </StandardTabWrapper>
  );
}
