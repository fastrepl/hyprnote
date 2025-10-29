import { commands as miscCommands } from "@hypr/plugin-misc";
import { useQuery } from "@tanstack/react-query";
import { convertFileSrc } from "@tauri-apps/api/core";
import { StickyNoteIcon } from "lucide-react";

import AudioPlayer from "../../../../contexts/audio-player";
import { useListener } from "../../../../contexts/listener";
import * as persisted from "../../../../store/tinybase/persisted";
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
  const title = persisted.UI.useCell("sessions", rowIdfromTab(tab), "title", persisted.STORE_ID);
  const { status, sessionId } = useListener((state) => ({ status: state.status, sessionId: state.sessionId }));
  const isActive = status === "running_active" && sessionId === tab.id;

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
  const { data: audioUrl } = useQuery({
    queryKey: ["session", tab.id, "audio-url"],
    queryFn: () => miscCommands.audioPath(tab.id),
    select: (result) => {
      if (result.status === "ok") {
        return convertFileSrc(result.data);
      }
      return null;
    },
  });

  return (
    <AudioPlayer.Provider url={audioUrl ?? ""}>
      <StandardTabWrapper
        afterBorder={tab.state.editor === "transcript" && <AudioPlayer.Timeline />}
        floatingButton={<FloatingActionButton tab={tab} />}
      >
        <div className="flex flex-col h-full p-2">
          <OuterHeader sessionId={tab.id} />
          <div className="mt-3 px-2 flex-shrink-0">
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
