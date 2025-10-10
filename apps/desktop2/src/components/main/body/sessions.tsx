import { StickyNoteIcon } from "lucide-react";
import { useCallback, useState } from "react";

import NoteEditor from "@hypr/tiptap/editor";
import { TabHeader } from "@hypr/ui/components/block/tab-header";
import TitleInput from "@hypr/ui/components/block/title-input";
import { ParticipantsChip } from "@hypr/ui/components/block/participants-chip";
import { EventChip, type Event } from "@hypr/ui/components/block/event-chip";
import * as persisted from "../../../store/tinybase/persisted";
import { rowIdfromTab, type Tab, useTabs } from "../../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemNote: TabItem = ({ tab, handleClose, handleSelect }) => {
  const title = persisted.UI.useCell("sessions", rowIdfromTab(tab), "title", persisted.STORE_ID);

  return (
    <TabItemBase
      icon={<StickyNoteIcon className="w-4 h-4" />}
      title={title ?? ""}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
};

export function TabContentNote({ tab }: { tab: Tab }) {
  const sessionId = rowIdfromTab(tab);
  const sessionRow = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);

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
    <div className="flex flex-col gap-2 px-2 pt-2">
      <TabContentNoteHeader sessionRow={sessionRow} />

      <TitleInput
        editable={true}
        value={sessionRow.title ?? ""}
        onChange={(e) => handleEditTitle(e.target.value)}
      />
      <TabHeader
        isEnhancing={false}
        onVisibilityChange={() => {}}
        currentTab="raw"
        onTabChange={() => {}}
        isCurrentlyRecording={false}
        shouldShowTab={true}
        shouldShowEnhancedTab={false}
      />
      <NoteEditor
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
  );
}

function TabContentNoteHeader({ sessionRow }: { sessionRow: ReturnType<typeof persisted.UI.useRow<"sessions">> }) {
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventActiveTab, setEventActiveTab] = useState<"event" | "date">("event");
  const [eventPopoverOpen, setEventPopoverOpen] = useState(false);
  
  // Get event data if there's an event_id
  const eventRow = sessionRow.event_id ? persisted.UI.useRow("events", sessionRow.event_id, persisted.STORE_ID) : null;
  
  const event: Event | null = eventRow && eventRow.started_at && eventRow.ended_at ? {
    id: sessionRow.event_id!,
    name: eventRow.title ?? "",
    start_date: eventRow.started_at,
    end_date: eventRow.ended_at,
    calendar_id: eventRow.calendar_id ?? undefined,
  } : null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {sessionRow.folder_id && (
          <TabContentNoteHeaderFolderChain
            title={sessionRow.title ?? ""}
            folderId={sessionRow.folder_id}
          />
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <EventChip
          event={event}
          date={sessionRow.created_at || new Date().toISOString()}
          isVeryNarrow={false}
          isNarrow={false}
          onEventSelect={(eventId) => {
            console.log("Select event:", eventId);
            setEventPopoverOpen(false);
          }}
          onEventDetach={() => {
            console.log("Detach event");
            setEventPopoverOpen(false);
          }}
          onDateChange={(date) => {
            console.log("Change date:", date);
            setEventPopoverOpen(false);
          }}
          onJoinMeeting={(meetingLink) => {
            console.log("Join meeting:", meetingLink);
          }}
          onViewInCalendar={() => {
            console.log("View in calendar");
          }}
          searchQuery={eventSearchQuery}
          onSearchChange={setEventSearchQuery}
          searchResults={[]}
          isSearching={false}
          activeTab={eventActiveTab}
          onTabChange={setEventActiveTab}
          isPopoverOpen={eventPopoverOpen}
          onPopoverChange={setEventPopoverOpen}
        />
        
        <ParticipantsChip 
          participants={[]}
          currentUserId={"placeholder"}
          isVeryNarrow={false}
          isNarrow={false}
          onParticipantClick={(participant) => {
            console.log("Participant clicked:", participant);
          }}
          onParticipantRemove={(participantId) => {
            console.log("Remove participant:", participantId);
          }}
          onParticipantAdd={(query) => {
            console.log("Add participant:", query);
          }}
          onParticipantSelect={(participantId) => {
            console.log("Select participant:", participantId);
          }}
          searchQuery=""
          onSearchChange={(query) => {
            console.log("Search query:", query);
          }}
          searchResults={[]}
          allowMutate={true}
        />
      </div>
    </div>
  );
}

function TabContentNoteHeaderFolderChain({ title, folderId }: { title: string; folderId: string }) {
  const folderIds = persisted.UI.useLinkedRowIds(
    "folderToParentFolder",
    folderId,
    persisted.STORE_ID,
  );

  if (!folderIds || folderIds.length === 0) {
    return null;
  }

  const folderChain = [...folderIds].reverse();

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      {folderChain.map((id, index) => (
        <div key={id} className="flex items-center gap-1">
          {index > 0 && <span>/</span>}
          <TabContentNoteHeaderFolder folderId={id} />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span>/</span>
        <span className="truncate max-w-[80px]">{title}</span>
      </div>
    </div>
  );
}

function TabContentNoteHeaderFolder({ folderId }: { folderId: string }) {
  const folderName = persisted.UI.useCell("folders", folderId, "name", persisted.STORE_ID);
  const { openNew } = useTabs();
  const handleClick = useCallback(() => {
    openNew({ type: "folders", id: folderId, active: true });
  }, [openNew, folderId]);

  return (
    <button
      className="text-gray-500 hover:text-gray-700"
      onClick={handleClick}
    >
      {folderName}
    </button>
  );
}

