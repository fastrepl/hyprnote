import { MoreHorizontalIcon } from "lucide-react";

export function OthersButton(_: { sessionId: string }) {
  return (
    <button className="text-xs rounded-lg hover:bg-gray-200 size-7">
      <MoreHorizontalIcon size={16} />
    </button>
  );
}
