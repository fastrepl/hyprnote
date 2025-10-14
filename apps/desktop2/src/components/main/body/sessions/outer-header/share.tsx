import { type SessionRowProp } from "./types";

export function ShareButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="text-xs px-2 py-1 rounded-lg hover:bg-gray-200 min-h-7">
      Share
    </button>
  );
}
