import { useCallback, useEffect, useState } from "react";

import * as persisted from "../../../../store/tinybase/persisted";
import { useTabs } from "../../../../store/zustand/tabs";
import { EventChip, type Event } from "@hypr/ui/components/block/event-chip";
import { ParticipantsChip } from "@hypr/ui/components/block/participants-chip";

export function OuterHeader(
  { sessionRow, sessionId }: { 
    sessionRow: ReturnType<typeof persisted.UI.useRow<"sessions">>;
    sessionId: string;
  },
) {
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventSearchResults, setEventSearchResults] = useState<Event[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Always call the hook, but use a dummy ID when there's no event_id
  const eventRow = persisted.UI.useRow(
    "events", 
    sessionRow.event_id || "dummy-event-id", 
    persisted.STORE_ID
  );

  // Get the store to search events
  const store = persisted.UI.useStore(persisted.STORE_ID);
  
  // Only use the event data if we have a real event_id
  const event: Event | null = sessionRow.event_id && eventRow && eventRow.started_at && eventRow.ended_at ? {
    id: sessionRow.event_id,
    name: eventRow.title ?? "",
    start_date: eventRow.started_at,
    end_date: eventRow.ended_at,
    calendar_id: eventRow.calendar_id ?? undefined,
  } : null;

  // Search for past events when query changes
  useEffect(() => {
    if (!store) return;
    
    const searchEvents = async () => {
      setIsSearching(true);
      
      try {
        const results: Event[] = [];
        const now = new Date();
        
        // Get all events from the store
        store.forEachRow("events", (rowId, row) => {
          const eventData = row as unknown as persisted.Event;
          if (!eventData.started_at || !eventData.ended_at) return;
          
          const eventEndDate = new Date(eventData.ended_at);
          
          // Only include past events (ended before now)
          if (eventEndDate >= now) return;
          
          // Filter by search query (case-insensitive)
          if (eventSearchQuery && 
              !eventData.title?.toLowerCase().includes(eventSearchQuery.toLowerCase())) {
            return;
          }
          
          results.push({
            id: rowId,
            name: eventData.title ?? "",
            start_date: eventData.started_at,
            end_date: eventData.ended_at,
            calendar_id: eventData.calendar_id ?? undefined,
          });
        });
        
        // Sort by start date (most recent first)
        results.sort((a, b) => 
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        );

        console.log("past events results", results);
        
        // Limit to 20 results
        setEventSearchResults(results.slice(0, 20));
      } finally {
        setIsSearching(false);
      }
    };
    
    // Debounce the search
    const timeoutId = setTimeout(searchEvents, 300);
    return () => clearTimeout(timeoutId);
  }, [eventSearchQuery, store]);


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

      <div className="flex items-center gap-3">
        <EventChip
          event={event}
          date={sessionRow.created_at || new Date().toISOString()}
          isVeryNarrow={false}
          isNarrow={false}
          onEventSelect={(eventId) => {
            if (store) {
              store.setCell("sessions", sessionId, "event_id", eventId);
            }
          }}
          onEventDetach={() => {
            if (store) {
              store.delCell("sessions", sessionId, "event_id");
            }
          }}
          onDateChange={(date) => {
            if (store) {
              store.setCell("sessions", sessionId, "created_at", date.toISOString());
            }
          }}
          onJoinMeeting={(meetingLink) => {
            window.open(meetingLink, '_blank');
          }}
          onViewInCalendar={() => {
            // TODO: Implement view in calendar functionality
          }}
          searchQuery={eventSearchQuery}
          onSearchChange={setEventSearchQuery}
          searchResults={eventSearchResults}
          isSearching={isSearching}
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
        {sessionRow.event_id && <RecordingButton sessionRow={sessionRow} />}
        <ListenButton sessionRow={sessionRow} />
        {shouldShowShareButton(sessionRow) && <ShareButton sessionRow={sessionRow} />}
        <OthersButton sessionRow={sessionRow} />
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

// Helper function to determine if share button should be shown
function shouldShowShareButton(_sessionRow: ReturnType<typeof persisted.UI.useRow<"sessions">>) {
  // Add your condition here
  return false;
}

// Button Components
type SessionRowProp = {
  sessionRow: ReturnType<typeof persisted.UI.useRow<"sessions">>;
};

function RecordingButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="text-xs">
      🎙️ 02:27
    </button>
  );
}

function ListenButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="px-2 py-1 bg-black text-white rounded text-xs">
      🔴 Start listening
    </button>
  );
}

function ShareButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="text-xs">
      Share
    </button>
  );
}

function OthersButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="text-xs">
      •••
    </button>
  );
}
