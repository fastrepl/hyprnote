import type { Note } from "../../types";

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
            미팅 참여하기
          </button>
        )}
        {showhyprcharge && (
          <button
            onClick={onhyprcharge}
            className="rounded-full bg-purple-600 px-4 py-1.5 text-sm text-white hover:bg-purple-800"
          >
            하이퍼차지
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {isRecording ? (
          <button
            onClick={onPauseResume}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm ${
              isPaused
                ? "bg-gray-600 text-white hover:bg-gray-800"
                : "animate-pulse bg-red-600 text-white hover:bg-red-800"
            }`}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-white" />
            {isPaused ? "일시정지 중" : formatTime(recordingTime)}
          </button>
        ) : (
          <button
            onClick={onStart}
            className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm text-white hover:bg-emerald-800"
          >
            녹음 시작
          </button>
        )}
      </div>
    </div>
  );
}
