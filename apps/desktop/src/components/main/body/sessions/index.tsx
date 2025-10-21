import { StickyNoteIcon } from "lucide-react";

import AudioPlayer from "../../../../contexts/audio-player";
import * as persisted from "../../../../store/tinybase/persisted";
import { rowIdfromTab, type Tab } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { FloatingActionButton } from "./floating";
import { NoteInput } from "./note-input";
import { OuterHeader } from "./outer-header";
import { TitleInput } from "./title-input";

export const TabItemNote: TabItem = (
  {
    tab,
    handleCloseThis,
    handleSelectThis,
    handleCloseOthers,
    handleCloseAll,
  },
) => {
  const title = persisted.UI.useCell("sessions", rowIdfromTab(tab), "title", persisted.STORE_ID);

  return (
    <TabItemBase
      icon={<StickyNoteIcon className="w-4 h-4" />}
      title={title || "Untitled"}
      active={tab.active}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentNote({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  return (
    <AudioPlayer.Provider url="/assets/audio.wav">
      <StandardTabWrapper afterBorder={tab.state.editor === "transcript" && <AudioPlayer.Timeline />}>
        <div className="p-2">
          <OuterHeader sessionId={tab.id} />
          <div className="mt-3 px-2">
            <TitleInput tab={tab} />
            <div className="mt-2">
              <NoteInput tab={tab} />
            </div>
            <FloatingActionButton tab={tab} />
          </div>
        </div>
      </StandardTabWrapper>
    </AudioPlayer.Provider>
  );
}
