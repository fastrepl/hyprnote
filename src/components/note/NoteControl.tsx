import type { Note } from "../../types";

interface NoteControlProps {
  note: Note | null;
  showHypercharge: boolean;
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  onHypercharge: () => void;
  onStart: () => void;
  onPauseResume: () => void;
}

export default function NoteControl({
  note,
  showHypercharge,
  isRecording,
  isPaused,
  recordingTime,
  onHypercharge,
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
    <div className="flex items-center justify-between">
      <div className="flex gap-2">
        {isVirtualMeeting && meetingUrl && (
          <button
            onClick={() => window.open(meetingUrl)}
            className="rounded-full bg-blue-50 px-4 py-1.5 text-sm text-blue-600 hover:bg-blue-100"
          >
            미팅 참여하기
          </button>
        )}
        {showHypercharge && (
          <button
            onClick={onHypercharge}
            className="rounded-full bg-purple-50 px-4 py-1.5 text-sm text-purple-600 hover:bg-purple-100"
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
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
          >
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                isPaused ? "bg-gray-600" : "animate-pulse bg-red-600"
              }`}
            />
            {isPaused ? "일시정지 중" : formatTime(recordingTime)}
          </button>
        ) : (
          <button
            onClick={onStart}
            className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm text-emerald-700 hover:bg-emerald-200"
          >
            녹음 시작
          </button>
        )}
      </div>
    </div>
  );
}
