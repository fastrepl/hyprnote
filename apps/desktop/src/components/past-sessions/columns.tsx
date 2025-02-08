import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import type { Session, Participant } from "@/types/tauri.gen";
import { commands } from "@/types/tauri.gen";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";

export const columns: ColumnDef<Session>[] = [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "timestamp",
    header: "Date",
    cell: ({ row }) => {
      const timestamp = parseFloat(row.getValue("timestamp"));
      const date = new Date(timestamp);
      return <span>{date.toLocaleString()}</span>;
    },
  },
  {
    id: "participants",
    header: "Participants",
    cell: ({ row }) => {
      const [participants, setParticipants] = useState<Participant[]>([]);
      const session = row.original;

      useEffect(() => {
        if (session.calendar_event_id) {
          commands
            .listParticipants({ Event: session.calendar_event_id })
            .then(setParticipants)
            .catch(console.error);
        }
      }, [session.calendar_event_id]);

      if (!session.calendar_event_id) return <span>-</span>;
      if (participants.length === 0) return <span>Loading...</span>;

      return (
        <div className="flex flex-wrap items-center gap-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="inline-flex items-center gap-1 rounded-full border px-1.5 py-1 text-xs"
              style={{
                backgroundColor: `${participant.color_hex}20`,
                borderColor: participant.color_hex,
              }}
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback
                  style={{ backgroundColor: participant.color_hex }}
                >
                  {participant.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {participant.name}
            </div>
          ))}
        </div>
      );
    },
  },
];
