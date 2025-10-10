import { type SessionRowProp } from "./types";

export function ShareButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="text-xs">
      Share
    </button>
  );
}
