import type { ActivityLoaderArgs } from "@stackflow/config";
import { AppScreen } from "@stackflow/plugin-basic-ui";
import { ActivityComponentType, useLoaderData } from "@stackflow/react/future";
import { Share2Icon } from "lucide-react";
import { useNote } from "../components/hooks/use-note";
import { NoteContent, NoteInfo } from "../components/note";
import { CalendarEventSheet, ParticipantsSheet, ShareSheet, TagsSheet } from "../components/note/bottom-sheets";
import { mockSessions } from "../mock/home";

export function noteLoader({
  params,
}: ActivityLoaderArgs<"NoteView">) {
  const { id } = params;

  const session = mockSessions.find(s => s.id === id) || {
    id,
    title: "Untitled Note",
    created_at: new Date().toISOString(),
    visited_at: new Date().toISOString(),
    user_id: "user-123",
    calendar_event_id: null,
    audio_local_path: null,
    audio_remote_path: null,
    raw_memo_html: "",
    enhanced_memo_html: null,
    conversations: [],
  };

  return { session };
}

export const NoteView: ActivityComponentType<"NoteView"> = () => {
  const { session } = useLoaderData<typeof noteLoader>();
  const {
    shareSheetOpen,
    setShareSheetOpen,
    participantsSheetOpen,
    setParticipantsSheetOpen,
    calendarSheetOpen,
    setCalendarSheetOpen,
    tagsSheetOpen,
    setTagsSheetOpen,
    mockEvent,
    mockTags,
    groupedParticipants,
    handlePublishNote,
    handleViewInCalendar,
    formatEventTime,
    getInitials,
  } = useNote({ session });

  const ShareButton = () => (
    <button onClick={() => setShareSheetOpen(true)}>
      <Share2Icon size={20} />
    </button>
  );

  return (
    <AppScreen
      appBar={{
        renderRight: ShareButton,
      }}
    >
      <div className="relative flex h-full flex-col">
        <div className="flex-1 flex flex-col overflow-hidden pt-6">
          <NoteInfo
            session={session}
            setParticipantsSheetOpen={setParticipantsSheetOpen}
            setCalendarSheetOpen={setCalendarSheetOpen}
            setTagsSheetOpen={setTagsSheetOpen}
          />

          <NoteContent session={session} />
        </div>

        <ShareSheet
          open={shareSheetOpen}
          onClose={() => setShareSheetOpen(false)}
          onPublish={handlePublishNote}
        />

        <ParticipantsSheet
          open={participantsSheetOpen}
          onClose={() => setParticipantsSheetOpen(false)}
          groupedParticipants={groupedParticipants}
          getInitials={getInitials}
        />

        <CalendarEventSheet
          open={calendarSheetOpen}
          onClose={() => setCalendarSheetOpen(false)}
          event={mockEvent}
          onViewInCalendar={handleViewInCalendar}
          formatEventTime={formatEventTime}
        />

        <TagsSheet
          open={tagsSheetOpen}
          onClose={() => setTagsSheetOpen(false)}
          tags={mockTags}
        />
      </div>
    </AppScreen>
  );
};

declare module "@stackflow/config" {
  interface Register {
    NoteView: {
      id: string;
    };
  }
}
