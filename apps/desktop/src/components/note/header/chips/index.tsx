import { useParams } from "@tanstack/react-router";

import { EventChip } from "./event-chip";
import { ParticipantsChip } from "./participants-chip";
import { TagChip } from "./tag-chip";

export default function Chips() {
  const { id } = useParams({ from: "/app/note/$id" });

  return (
    <div className="-mx-1.5 flex flex-row items-center sm:px-8 px-4 pb-4 pt-1 overflow-x-auto scrollbar-none whitespace-nowrap">
      <EventChip sessionId={id} />
      <ParticipantsChip sessionId={id} />
      <TagChip sessionId={id} />
    </div>
  );
}
