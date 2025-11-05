import { commands as miscCommands } from "@hypr/plugin-misc";
import { useQuery } from "@tanstack/react-query";
import { convertFileSrc } from "@tauri-apps/api/core";
import { StickyNoteIcon } from "lucide-react";

import AudioPlayer from "../../../../contexts/audio-player";
import { useListener } from "../../../../contexts/listener";
import * as main from "../../../../store/tinybase/main";
import { rowIdfromTab, type Tab } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { FloatingActionButton } from "./floating";
import { NoteInput } from "./note-input";
import { OuterHeader } from "./outer-header";
import { TitleInput } from "./title-input";

export const TabItemNote: TabItem<Extract<Tab, { type: "sessions" }>> = (
  {
    tab,
    tabIndex,
    handleCloseThis,
    handleSelectThis,
    handleCloseOthers,
    handleCloseAll,
  },
) => {
  const title = main.UI.useCell("sessions", rowIdfromTab(tab), "title", main.STORE_ID);
  const { status, sessionId } = useListener((state) => ({ status: state.status, sessionId: state.sessionId }));
  const isActive = status !== "inactive" && sessionId === tab.id;

  return (
    <TabItemBase
      icon={<StickyNoteIcon className="w-4 h-4" />}
      title={title || "Untitled"}
      selected={tab.active}
      active={isActive}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentNote({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const listenerStatus = useListener((state) => state.status);
  const { data: audioUrl } = useQuery({
    queryKey: ["audio", tab.id, "url"],
    queryFn: () => miscCommands.audioPath(tab.id),
    select: (result) => {
      if (result.status === "error") {
        console.error(result.error);
        return null;
      }
      return convertFileSrc(result.data);
    },
  });

  const showTimeline = tab.state.editor === "transcript"
    && audioUrl && listenerStatus === "inactive";

  return (
    <AudioPlayer.Provider sessionId={tab.id} url={audioUrl ?? ""}>
      <StandardTabWrapper
        afterBorder={showTimeline && <AudioPlayer.Timeline />}
        floatingButton={<FloatingActionButton tab={tab} />}
      >
        <div className="flex flex-col h-full">
          <div className="px-2">
            <OuterHeader sessionId={tab.id} />
          </div>
          <div className="mt-2 px-3 flex-shrink-0">
            <TitleInput tab={tab} />
          </div>
          <div className="mt-2 px-2 flex-1 min-h-0">
            <NoteInput tab={tab} />
          </div>
        </div>
      </StandardTabWrapper>
    </AudioPlayer.Provider>
  );
}
