import { useCallback, useState } from "react";

import { type Event, EventChip } from "@hypr/ui/components/block/event-chip";
import { Participant, ParticipantsChip } from "@hypr/ui/components/block/participants-chip";
import { useQuery } from "../../../../hooks/useQuery";
import * as persisted from "../../../../store/tinybase/persisted";
import { useTabs } from "../../../../store/zustand/tabs";

export function OuterHeader(
  { sessionRow, sessionId }: {
    sessionRow: ReturnType<typeof persisted.UI.useRow<"sessions">>;
    sessionId: string;
  },
) {
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [participantSearchQuery, setParticipantSearchQuery] = useState("");
  const [participantSearchResults, setParticipantSearchResults] = useState<Participant[]>([]);

  const eventRow = persisted.UI.useRow(
    "events",
    sessionRow.event_id || "dummy-event-id",
    persisted.STORE_ID,
  );

  const store = persisted.UI.useStore(persisted.STORE_ID);

  const event: Event | null = sessionRow.event_id && eventRow && eventRow.started_at && eventRow.ended_at
    ? {
      id: sessionRow.event_id,
      name: eventRow.title ?? "",
      start_date: eventRow.started_at,
      end_date: eventRow.ended_at,
      calendar_id: eventRow.calendar_id ?? undefined,
    }
    : null;

  const eventSearch = useQuery({
    enabled: !!store,
    deps: [store, eventSearchQuery] as const,
    queryFn: async (store, query) => {
      const results: Event[] = [];
      const now = new Date();

      store!.forEachRow("events", (rowId, forEachCell) => {
        let title: string | undefined;
        let started_at: string | undefined;
        let ended_at: string | undefined;
        let calendar_id: string | undefined;

        forEachCell((cellId, cell) => {
          if (cellId === "title") {
            title = cell as string;
          } else if (cellId === "started_at") {
            started_at = cell as string;
          } else if (cellId === "ended_at") {
            ended_at = cell as string;
          } else if (cellId === "calendar_id") {
            calendar_id = cell as string;
          }
        });

        if (!started_at || !ended_at) {
          return;
        }

        const eventEndDate = new Date(ended_at);

        if (eventEndDate >= now) {
          return;
        }

        if (
          query && title
          && !title.toLowerCase().includes(query.toLowerCase())
        ) {
          return;
        }

        results.push({
          id: rowId,
          name: title ?? "",
          start_date: started_at,
          end_date: ended_at,
          calendar_id: calendar_id,
        });
      });

      results.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
      return results.slice(0, 20);
    },
  });

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
            window.open(meetingLink, "_blank");
          }}
          onViewInCalendar={() => {
            // TODO: Implement view in calendar functionality
          }}
          searchQuery={eventSearchQuery}
          onSearchChange={setEventSearchQuery}
          searchResults={eventSearch.data ?? []}
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
