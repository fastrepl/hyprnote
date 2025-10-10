import { type SessionRowProp } from "./types";

export function RecordingButton({
  sessionRow: _sessionRow,
  onToggle,
  isActive,
}: SessionRowProp & { onToggle: () => void; isActive: boolean }) {
  return (
    <button
      onClick={onToggle}
      className={`text-xs transition-opacity ${isActive ? "opacity-100" : "opacity-50 hover:opacity-75"}`}
    >
      🎙️ 02:27
    </button>
  );
}
