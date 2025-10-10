import { type SessionRowProp } from "./types";

export function ListenButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="px-2 py-1 bg-black text-white rounded text-xs">
      🔴 Start listening
    </button>
  );
}
