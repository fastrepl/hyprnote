import { type SessionRowProp } from "./types";

export function RecordingButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="text-xs">
      🎙️ 02:27
    </button>
  );
}
