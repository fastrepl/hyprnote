import { MoreHorizontalIcon } from "lucide-react";

import { type SessionRowProp } from "./types";

export function OthersButton({ sessionRow: _sessionRow }: SessionRowProp) {
  return (
    <button className="text-xs rounded-lg hover:bg-gray-200 size-7">
      <MoreHorizontalIcon size={16} />
    </button>
  );
}
