import type { Event } from "../../types";

interface EventCardProps {
  event: Event;
  handleClick: () => void;
}

export const EventCard = ({ event, handleClick }: EventCardProps) => {
  return (
    <div className="h-[140px] w-full">
      <div
        onClick={handleClick}
        className="flex h-full w-full cursor-pointer flex-col rounded-lg bg-white p-4 transition-shadow hover:shadow-[0_4px_12px_0px_rgba(251,191,36,0.2),0_4px_12px_0px_rgba(99,102,241,0.2)]"
      >
        <div className="mb-2 flex items-start justify-between">
          {/* <h3 className="line-clamp-1 font-medium">{event.title}</h3> */}
          <span className="ml-2 shrink-0 text-sm text-gray-500">
            {/* {event.calendarEvent?.start.dateTime
              ? new Date(event.calendarEvent.start.dateTime).toLocaleString()
              : "No date"} */}
          </span>
        </div>
        {/* <p className="line-clamp-3 text-sm text-gray-600">{note.rawMemo}</p> */}
      </div>
    </div>
  );
};
