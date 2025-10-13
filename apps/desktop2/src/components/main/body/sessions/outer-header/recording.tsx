import { useAudioPlayerContext } from "../../../../../contexts/audio-player";
import { type SessionRowProp } from "./types";

export function RecordingButton({
  sessionRow: _sessionRow,
  onToggle,
  isActive,
}: SessionRowProp & { onToggle: () => void; isActive: boolean }) {
  const { currentTime } = useAudioPlayerContext();

  return (
    <button
      onClick={onToggle}
      className={`text-xs transition-opacity ${isActive ? "opacity-100" : "opacity-50 hover:opacity-75"}`}
    >
      🎙️ {formatTime(currentTime)}
    </button>
  );
}

const formatTime = (seconds: number) =>
  [Math.floor(seconds / 60), Math.floor(seconds % 60)]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
