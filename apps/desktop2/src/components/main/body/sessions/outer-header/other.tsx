import { type SessionRowProp } from "./types";

export function OthersButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="text-xs">
      •••
    </button>
  );
}
