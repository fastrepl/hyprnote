import clsx from "clsx";

import { type SessionRowProp } from "./types";

export function ListenButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button
      className={clsx(
        "px-3.5 py-1.5",
        "bg-black text-white",
        "rounded-lg text-xs min-h-7",
        "flex items-center gap-1.5",
        "hover:bg-neutral-800 hover:scale-95 transition-all",
      )}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
      </span>
      Start listening
    </button>
  );
}
