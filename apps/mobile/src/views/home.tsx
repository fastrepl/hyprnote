import type { ActivityLoaderArgs } from "@stackflow/config";
import { AppScreen } from "@stackflow/plugin-basic-ui";
import { ActivityComponentType, useFlow, useLoaderData } from "@stackflow/react/future";
import { Settings } from "lucide-react";
import { NewNoteSelectionSheet } from "../components/home/bottom-sheets";
import { CreateNoteButton, ReturnToNoteButton } from "../components/home/buttons";
import { NotesSection } from "../components/home/notes-section";
import { UpcomingSection } from "../components/home/upcoming-section";
import { useHome } from "../components/hooks/use-home";
import { mockEvents } from "../mock";

export function homeLoader({}: ActivityLoaderArgs<"HomeView">) {
  // TODO: For the upcoming events in mobile, let's just fetch < 1 week
  return {
    upcomingEvents: mockEvents,
  };
}

export const HomeView: ActivityComponentType<"HomeView"> = () => {
  const { upcomingEvents } = useLoaderData<typeof homeLoader>();
  const { push } = useFlow();

  const {
    sheetOpen,
    setSheetOpen,
    upcomingExpanded,
    setUpcomingExpanded,
    notes,
    groupedNotes,
    sortedDates,
    handleUploadFile,
    handleStartRecord,
    handleNoteClick,
    formatDateHeader,
  } = useHome();

  const handleClickSettings = () => {
    push("SettingsView", {});
  };

  const RightButton = () => (
    <button onClick={handleClickSettings}>
      <Settings size={20} />
    </button>
  );

  return (
    <AppScreen
      appBar={{
        title: "All Meeting Notes",
        renderRight: RightButton,
      }}
    >
      <div className="h-full overflow-y-auto px-4 pt-6 pb-20 space-y-6">
        {upcomingEvents && upcomingEvents.length > 0 && (
          <UpcomingSection
            upcomingEvents={upcomingEvents}
            upcomingExpanded={upcomingExpanded}
            setUpcomingExpanded={setUpcomingExpanded}
            onSelectEvent={(sessionId) => handleNoteClick(sessionId)}
          />
        )}

        {sortedDates.map((dateKey) => {
          const sessions = groupedNotes[dateKey];
          const date = new Date(dateKey);

          return (
            <NotesSection
              key={dateKey}
              dateKey={dateKey}
              date={date}
              sessions={sessions}
              formatDateHeader={formatDateHeader}
              onSelectNote={handleNoteClick}
            />
          );
        })}

        {notes && notes.length === 0 && (
          <div className="flex flex-col justify-center items-center h-64">
            <p className="text-neutral-500 mb-4">No notes yet</p>
            <CreateNoteButton onClick={() => setSheetOpen(true)} />
          </div>
        )}
      </div>

      <div
        className="fixed z-10 bottom-0 left-0 right-0 flex justify-center px-4 pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <ReturnToNoteButton />
      </div>

      <NewNoteSelectionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onUploadFile={handleUploadFile}
        onStartRecord={handleStartRecord}
      />
    </AppScreen>
  );
};

declare module "@stackflow/config" {
  interface Register {
    HomeView: {};
  }
}
