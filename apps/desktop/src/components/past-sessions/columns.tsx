import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format, isThisYear } from "date-fns";

import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { commands, type Session, type Human } from "@/types";

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
      const formattedDate = isThisYear(date)
        ? format(date, "MMM d (EEE), h:mm a")
        : format(date, "MMM d (EEE), h:mm a, yyyy");
      return <span>{formattedDate}</span>;
    },
  },
  {
    id: "participants",
    header: "Participants",
    cell: ({ row }) => {
      const [participants, setParticipants] = useState<Human[]>([]);
      const session = row.original;

      useEffect(() => {
        if (session.calendar_event_id) {
          commands
            .listParticipants(session.calendar_event_id)
            .then(setParticipants)
            .catch(console.error);
        }
      }, [session.calendar_event_id]);

      if (!session.calendar_event_id) {
        return null;
      }
      if (participants.length === 0) {
        return <span>Loading...</span>;
      }

      return (
        <div className="flex items-center gap-2">
          {participants.slice(0, 3).map((participant) => (
            <div
              key={participant.id}
              className="inline-flex items-center gap-1 rounded-full border px-1.5 py-1 text-xs"
              style={{
                backgroundColor: "gray",
                borderColor: "black",
              }}
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback style={{ backgroundColor: "gray" }}>
                  {participant.full_name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {participant.full_name}
            </div>
          ))}
          {participants.length > 3 && (
            <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs text-neutral-500">
              +{participants.length - 3} more
            </div>
          )}
        </div>
      );
    },
  },
];
