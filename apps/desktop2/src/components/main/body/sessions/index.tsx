import { StickyNoteIcon } from "lucide-react";
import { useState } from "react";

import { AudioPlayerProvider } from "../../../../contexts/audio-player";
import * as persisted from "../../../../store/tinybase/persisted";
import { rowIdfromTab, type Tab } from "../../../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "../shared";
import { FloatingActionButtonn } from "./floating-action";
import { NoteInput } from "./note-input";
import { OuterHeader } from "./outer-header";
import { AudioPlayer } from "./player";
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
  const sessionId = rowIdfromTab(tab);
  const sessionRow = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  const handleEditTitle = persisted.UI.useSetRowCallback(
    "sessions",
    sessionId,
    (input: string, _store) => ({ ...sessionRow, title: input }),
    [sessionRow],
    persisted.STORE_ID,
  );

  const handleRegenerate = (templateId: string | null) => {
    console.log("Regenerate clicked:", templateId);
  };

  return (
    <AudioPlayerProvider url="/assets/audio.wav">
      <div className="flex flex-col h-full gap-1">
        <div className="flex flex-col px-4 py-1 rounded-lg border flex-1 overflow-hidden relative">
          <div className="py-1">
            <OuterHeader
              isPlayerVisible={showAudioPlayer}
              sessionRow={sessionRow}
              sessionId={sessionId}
              onToggleAudioPlayer={() => setShowAudioPlayer(!showAudioPlayer)}
            />
          </div>

          <TitleInput
            editable={true}
            value={sessionRow.title ?? ""}
            onChange={handleEditTitle}
          />
          <NoteInput tab={tab} />
          <FloatingActionButtonn onRegenerate={handleRegenerate} />
        </div>
        {showAudioPlayer && <AudioPlayer />}
      </div>
    </AudioPlayerProvider>
  );
}
