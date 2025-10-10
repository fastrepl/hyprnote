import { StickyNoteIcon } from "lucide-react";
import { useMemo, useState } from "react";

import NoteEditor from "@hypr/tiptap/editor";
import * as persisted from "../../../../store/tinybase/persisted";
import { rowIdfromTab, type Tab } from "../../../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "../shared";
import { InnerHeader } from "./inner-header";
import { OuterHeader } from "./outer-header";
import { AudioPlayer } from "./player";
import { TitleInput } from "./title-input";

export const TabItemNote: TabItem = ({ tab, handleClose, handleSelect }) => {
  const title = persisted.UI.useCell("sessions", rowIdfromTab(tab), "title", persisted.STORE_ID);

  return (
    <TabItemBase
      icon={<StickyNoteIcon className="w-4 h-4" />}
      title={title ?? "Untitled"}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
};

export function TabContentNote({ tab }: { tab: Tab }) {
  const sessionId = rowIdfromTab(tab);
  const sessionRow = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  const editorKey = useMemo(
    () => `session-${sessionId}-raw`,
    [sessionId],
  );

  const handleEditTitle = persisted.UI.useSetRowCallback(
    "sessions",
    sessionId,
    (input: string, _store) => ({ ...sessionRow, title: input }),
    [sessionRow],
    persisted.STORE_ID,
  );

  const handleEditRawMd = persisted.UI.useSetRowCallback(
    "sessions",
    sessionId,
    (input: string, _store) => ({ ...sessionRow, raw_md: input }),
    [sessionRow],
    persisted.STORE_ID,
  );

  return (
    <div className="flex flex-col px-4 py-1 rounded-lg border">
      <div className="py-1">
        <OuterHeader sessionRow={sessionRow} sessionId={sessionId} />
      </div>

        <TitleInput
          editable={true}
          value={sessionRow.title ?? ""}
          onChange={(e) => handleEditTitle(e.target.value)}
        />
        <InnerHeader
          tab={tab}
          onVisibilityChange={() => {}}
          isCurrentlyRecording={false}
          shouldShowTab={true}
          shouldShowEnhancedTab={false}
        />
        <div className="py-1"></div>
        <NoteEditor
          key={editorKey}
          initialContent={sessionRow.raw_md ?? ""}
          handleChange={(e) => handleEditRawMd(e)}
          mentionConfig={{
            trigger: "@",
            handleSearch: async () => {
              return [];
            },
          }}
        />
      </div>
      {showAudioPlayer && <AudioPlayer url="https://www2.cs.uic.edu/~i101/SoundFiles/gettysburg10.wav" />}
    </div>
  );
}
