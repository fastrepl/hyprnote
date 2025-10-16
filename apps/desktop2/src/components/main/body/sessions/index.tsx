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
      title={title ?? "Untitled"}
      active={tab.active}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentNote({ tab }: { tab: Tab }) {
  if (tab.type !== "sessions") {
    return null;
  }

  return (
    <AudioPlayer.Provider url="/assets/audio.wav">
      <StandardTabWrapper
        afterBorder={tab.state.editor === "transcript" && <AudioPlayer.Timeline />}
      >
        <div className="py-1">
          <OuterHeader sessionId={tab.id} />
        </div>

        <TitleInput sessionId={tab.id} />
        <NoteInput tab={tab} />
        <FloatingActionButton editorView={tab.state.editor} />
      </StandardTabWrapper>
    </AudioPlayer.Provider>
  );
}
