import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";
import type { ActivityLoaderArgs } from "@stackflow/config";
import { AppScreen } from "@stackflow/plugin-basic-ui";
import { ActivityComponentType, useLoaderData } from "@stackflow/react/future";
import { Share2Icon } from "lucide-react";
import { useNote } from "../components/hooks/use-note";
import { NoteContent, NoteInfo } from "../components/note";
import { CalendarEventSheet, ParticipantsSheet, ShareSheet, TagsSheet } from "../components/note/bottom-sheets";
import { ProcessingStatus } from "../components/note/processing-status";
import { Transcript } from "../components/note/transcript";
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
    noteStatus,
    mockEvent,
    mockTags,
    groupedParticipants,
    handlePublishNote,
    handleViewInCalendar,
    formatEventTime,
    audioLevel,
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
      <div className="flex flex-col h-full overflow-hidden">
        <NoteInfo
          session={session}
          setParticipantsSheetOpen={setParticipantsSheetOpen}
          setCalendarSheetOpen={setCalendarSheetOpen}
          setTagsSheetOpen={setTagsSheetOpen}
        />

        {session.enhanced_memo_html
          ? (
            <Tabs defaultValue="note" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-4 rounded-md">
                <TabsTrigger
                  value="note"
                  className="flex-1 data-[state=active]:bg-neutral-700 data-[state=active]:text-neutral-100"
                >
                  Note
                </TabsTrigger>

                <TabsTrigger
                  value="transcript"
                  className="flex-1 data-[state=active]:bg-neutral-700 data-[state=active]:text-neutral-100"
                >
                  Transcript
                </TabsTrigger>
              </TabsList>

              <TabsContent value="note" className="flex-1 overflow-y-auto">
                <NoteContent session={session} />
              </TabsContent>

              <TabsContent value="transcript" className="flex-1 overflow-y-auto">
                <Transcript session={session} />
              </TabsContent>
            </Tabs>
          )
          : <ProcessingStatus session={session} noteStatus={noteStatus} audioLevel={audioLevel} />}
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
