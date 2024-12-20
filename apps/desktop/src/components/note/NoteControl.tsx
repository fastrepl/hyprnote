import type { Note } from "../../types";
import { useTranslation } from "react-i18next";

interface NoteControlProps {
  note: Note | null;
  showhyprcharge: boolean;
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  onhyprcharge: () => void;
  onStart: () => void;
  onPauseResume: () => void;
}

export default function NoteControl({
  note,
  showhyprcharge,
  isRecording,
  isPaused,
  recordingTime,
  onhyprcharge,
  onStart,
  onPauseResume,
}: NoteControlProps) {
  const { t } = useTranslation();
  const isVirtualMeeting =
    (note?.calendarEvent?.conferenceData?.entryPoints?.length ?? 0) > 0;
  const meetingUrl =
    note?.calendarEvent?.hangoutLink ||
    note?.calendarEvent?.conferenceData?.entryPoints?.[0]?.uri;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex gap-2">
        {isVirtualMeeting && meetingUrl && (
          <button
            onClick={() => window.open(meetingUrl)}
            className="rounded-full bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-800"
          >
            {t("note.controls.joinMeeting")}
          </button>
        )}
        {showhyprcharge && (
          <button
            onClick={onhyprcharge}
            className="rounded-full border-2 border-purple-600 bg-purple-600 px-4 py-1.5 text-sm text-white hover:bg-purple-700"
          >
            {t("note.controls.hypercharge")}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {isRecording ? (
          <button
            onClick={onPauseResume}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm ${
              isPaused
                ? "border-2 border-gray-600 bg-gray-600 text-white hover:bg-gray-700"
                : "border-2 border-red-600 bg-white text-red-600"
            }`}
          >
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
            {isPaused ? t("note.controls.paused") : formatTime(recordingTime)}
          </button>
        ) : (
          <button
            onClick={onStart}
            className="rounded-full border-2 border-red-600 bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700"
          >
            {t("note.controls.startRecording")}
          </button>
        )}
      </div>
    </div>
  );
}
