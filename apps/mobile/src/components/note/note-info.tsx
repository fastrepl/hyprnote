import { type Session } from "@hypr/plugin-db";
import { CalendarIcon, TagsIcon, Users2Icon } from "lucide-react";
import { useNote } from "../hooks/use-note";

interface SessionInfoProps {
  session: Session;
  setParticipantsSheetOpen: (open: boolean) => void;
  setCalendarSheetOpen: (open: boolean) => void;
  setTagsSheetOpen: (open: boolean) => void;
}

export function NoteInfo({
  session,
  setParticipantsSheetOpen,
  setCalendarSheetOpen,
  setTagsSheetOpen,
}: SessionInfoProps) {
  const {
    title,
    currentDate,
    mockParticipants,
    mockTags,
    handleTitleChange,
    handleTitleBlur,
  } = useNote({ session });

  return (
    <div className="px-4 w-full flex flex-col pb-4 pt-6">
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        onBlur={handleTitleBlur}
        className="text-xl font-medium text-neutral-800 mb-2 w-full outline-none border-none focus:ring-0 focus:outline-none bg-transparent p-0"
        placeholder="Untitled"
      />

      <div className="flex flex-row items-center whitespace-nowrap gap-2 overflow-x-auto scrollbar-none">
        <button
          className="-mx-1.5 flex flex-row items-center gap-1 rounded-md px-2 py-1.5 hover:bg-neutral-100 text-xs"
          onClick={() => setCalendarSheetOpen(true)}
        >
          <CalendarIcon size={14} />
          {currentDate}
        </button>

        <button
          className="flex flex-row items-center gap-1 rounded-md px-2 py-1.5 hover:bg-neutral-100 text-xs"
          onClick={() => setParticipantsSheetOpen(true)}
        >
          <Users2Icon size={14} />
          {mockParticipants.length > 2
            ? (
              <span>
                {mockParticipants[0].full_name} +{mockParticipants.length - 1}
              </span>
            )
            : (
              <span>
                {mockParticipants.length} Participant
                {mockParticipants.length !== 1 ? "s" : ""}
              </span>
            )}
        </button>

        <button
          className="flex flex-row items-center gap-1 rounded-md px-2 py-1.5 hover:bg-neutral-100 text-xs"
          onClick={() => setTagsSheetOpen(true)}
        >
          <TagsIcon size={14} />
          {mockTags.length > 0 && (
            <span>
              {mockTags[0].name} +{mockTags.length - 1}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
