import { MapPinIcon } from "lucide-react";

import { useMeetingMetadata } from "./shared";

export function MeetingLocation({ sessionId }: { sessionId: string }) {
  const meta = useMeetingMetadata(sessionId);

  if (!meta?.location) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <MapPinIcon size={16} className="flex-shrink-0 text-neutral-700" />
      <span className="text-sm text-neutral-700 truncate">
        {meta.location}
      </span>
    </div>
  );
}
