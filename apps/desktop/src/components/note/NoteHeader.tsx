import { Calendar } from "lucide-react";
import type { Note } from "../../types";
import { formatMeetingTime } from "../../utils/time";
import NoteControl from "./NoteControl";

interface NoteHeaderProps {
  note: Note | null;
  noteTitle: string;
  showhyprcharge: boolean;
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  onTitleChange: (title: string) => void;
  onhyprcharge: () => void;
  onStartRecording: () => void;
  onPauseResume: () => void;
}

export default function NoteHeader({
  note,
  noteTitle,
  showhyprcharge,
  isRecording,
  isPaused,
  recordingTime,
  onTitleChange,
  onhyprcharge,
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
            placeholder="Untitled"
            className="w-full text-lg font-medium focus:outline-none"
          />
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            {note?.calendarEvent && (
              <div className="inline-flex items-center text-blue-600">
                <Calendar className="mr-2 h-4 w-4" />
                <span className="font-medium">
                  {note.calendarEvent.summary}{" "}
                  {formatMeetingTime(note.calendarEvent.start)} ~{" "}
                  {formatMeetingTime(note.calendarEvent.end)}
                </span>
              </div>
            )}
            {note?.calendarEvent && note?.tags && (
              <div className="mx-2 h-3 w-px bg-blue-300" />
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
          showhyprcharge={showhyprcharge}
          isRecording={isRecording}
          isPaused={isPaused}
          recordingTime={recordingTime}
          onhyprcharge={onhyprcharge}
          onStart={onStartRecording}
          onPauseResume={onPauseResume}
        />
      </div>
    </div>
  );
}
