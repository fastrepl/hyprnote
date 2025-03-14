import { type Event } from "@hypr/plugin-db";
import { CalendarIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { EventItem } from "./index";

interface UpcomingSectionProps {
  upcomingEvents: Event[];
  upcomingExpanded: boolean;
  setUpcomingExpanded: (expanded: boolean) => void;
  onSelectEvent: (sessionId: string) => void;
}

export const UpcomingSection = ({
  upcomingEvents,
  upcomingExpanded,
  setUpcomingExpanded,
  onSelectEvent,
}: UpcomingSectionProps) => {
  if (!upcomingEvents || upcomingEvents.length === 0) {
    return null;
  }

  return (
    <section>
      <h2
        className="font-medium text-neutral-800 mb-3 flex items-center gap-2 cursor-pointer w-fit"
        onClick={() => setUpcomingExpanded(!upcomingExpanded)}
      >
        <CalendarIcon className="size-4" />
        <strong>Upcoming</strong>
        {upcomingExpanded
          ? <ChevronDownIcon className="size-4" />
          : <ChevronRightIcon className="size-4" />}
      </h2>

      {upcomingExpanded && (
        <div className="space-y-2">
          {upcomingEvents.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              onSelect={onSelectEvent}
            />
          ))}
        </div>
      )}
    </section>
  );
};
