import type { Note, CalendarEvent } from "../../types";
import NoteControl from "./NoteControl";

interface NoteHeaderProps {
  note: Note | null;
  isNew: boolean;
  noteTitle: string;
  showHypercharge: boolean;
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  onTitleChange: (title: string) => void;
  onHypercharge: () => void;
  onStartRecording: () => void;
  onPauseResume: () => void;
}

export default function NoteHeader({
  note,
  isNew,
  noteTitle,
  showHypercharge,
  isRecording,
  isPaused,
  recordingTime,
  onTitleChange,
  onHypercharge,
  onStartRecording,
  onPauseResume,
}: NoteHeaderProps) {
  const formatMeetingTime = (start: CalendarEvent["start"]) => {
    const now = new Date();
    const startTime = start.dateTime
      ? new Date(start.dateTime)
      : start.date
        ? new Date(start.date)
        : null;

    if (!startTime) return "";

    const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="sticky top-0 z-10 border-b bg-white p-4 px-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <input
            type="text"
            value={noteTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={isNew ? "제목 없음" : ""}
            className="w-full text-lg font-medium focus:outline-none"
          />
          {note?.calendarEvent && (
            <div className="mt-1 flex items-center text-sm">
              <div className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-blue-600">
                <span>{note.calendarEvent.summary}</span>
                <div className="mx-2 h-4 w-px bg-blue-300" />
                <span>
                  {formatMeetingTime(note.calendarEvent.start)} ~{" "}
                  {formatMeetingTime(note.calendarEvent.end)}
                </span>
              </div>
            </div>
          )}
        </div>

        <NoteControl
          note={note}
          showHypercharge={showHypercharge}
          isRecording={isRecording}
          isPaused={isPaused}
          recordingTime={recordingTime}
          onHypercharge={onHypercharge}
          onStart={onStartRecording}
          onPauseResume={onPauseResume}
        />
      </div>
    </div>
  );
}
