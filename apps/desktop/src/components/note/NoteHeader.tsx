import type { Note } from "../../types";
import { formatMeetingTime } from "../../utils/time";
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
  return (
    <div className="border-b bg-white p-4 px-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <input
            type="text"
            value={noteTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={isNew ? "제목 없음" : ""}
            className="w-full text-lg font-medium focus:outline-none"
          />
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            {note?.calendarEvent && (
              <div className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-blue-600">
                <span>{note.calendarEvent.summary}</span>
                <div className="mx-2 h-4 w-px bg-blue-300" />
                <span>
                  {formatMeetingTime(note.calendarEvent.start)} ~{" "}
                  {formatMeetingTime(note.calendarEvent.end)}
                </span>
              </div>
            )}
            {note?.tags &&
              note.tags.length > 0 &&
              note.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-600"
                >
                  {tag}
                </span>
              ))}
          </div>
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
