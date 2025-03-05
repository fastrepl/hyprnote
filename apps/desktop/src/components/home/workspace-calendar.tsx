import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameMonth,
  isWeekend,
  addWeeks,
} from "date-fns";
import { useState } from "react";
import { Pen } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { Button } from "@hypr/ui/components/ui/button";
import { Switch } from "@hypr/ui/components/ui/switch";

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  date: Date;
};

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Team Meeting",
    description: "Weekly sync with the team",
    date: new Date(new Date().setDate(new Date().getDate() - 2)),
  },
  {
    id: "2",
    title: "Project Review",
    description: "Review Q1 progress",
    date: new Date(new Date().setDate(new Date().getDate() + 1)),
  },
  {
    id: "3",
    title: "Client Call",
    description: "Monthly check-in",
    date: new Date(new Date().setDate(new Date().getDate() + 3)),
  },
  {
    id: "4",
    title: "Planning",
    description: "Sprint planning",
    date: new Date(new Date().setDate(new Date().getDate() + 5)),
  },
  {
    id: "5",
    title: "Training",
    description: "New tool training",
    date: new Date(new Date().setDate(new Date().getDate() + 7)),
  },
  {
    id: "6",
    title: "Product Launch",
    description: "New product release event",
    date: new Date(new Date().setDate(new Date().getDate() + 7)),
  },
  {
    id: "7",
    title: "Design Workshop",
    description: "Brainstorming session for UI/UX",
    date: new Date(new Date().setDate(new Date().getDate() + 7)),
  },
  {
    id: "8",
    title: "Code Review",
    description: "Team code review for new feature",
    date: new Date(new Date().setDate(new Date().getDate() + 7)),
  },
  {
    id: "9",
    title: "Strategy Meeting",
    description: "Quarterly strategy planning",
    date: new Date(new Date().setDate(new Date().getDate() + 7)),
  },
];

function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="text-xs p-1 bg-blue-100 rounded cursor-pointer truncate hover:bg-blue-200">
          {event.title}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <p className="text-sm mb-2">
          {format(event.date, "MMMM d, yyyy h:mm a")}
        </p>

        <div className="font-semibold text-lg mb-1">{event.title}</div>

        <p className="text-sm text-muted-foreground mb-4">
          {event.description}
        </p>

        <Button className="w-full" size="md">
          <Pen className="mr-2 size-4" />
          Prepare Meeting Note
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function DayEvents({ date, events }: { date: Date; events: CalendarEvent[] }) {
  if (events.length === 0) return null;

  if (events.length <= 4) {
    return (
      <div className="space-y-1 mt-1">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1 mt-1">
      {events.slice(0, 3).map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <div className="text-xs p-1 bg-neutral-100 rounded cursor-pointer text-center hover:bg-neutral-200">
            +{events.length - 3} more
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 space-y-2">
          <div className="text-lg font-semibold">
            {format(date, "MMMM d, yyyy")}
          </div>

          {events.map((event) => (
            <Popover key={event.id}>
              <PopoverTrigger asChild>
                <div className="text-sm p-2 hover:bg-neutral-100 rounded cursor-pointer">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-muted-foreground">
                    {event.description}
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" side="right">
                <p className="text-sm mb-2">
                  {format(event.date, "MMMM d, yyyy h:mm a")}
                </p>

                <div className="font-semibold text-lg mb-1">{event.title}</div>

                <p className="text-sm text-muted-foreground mb-4">
                  {event.description}
                </p>

                <Button className="w-full" size="md">
                  <Pen className="mr-2 size-4" />
                  Prepare Meeting Note
                </Button>
              </PopoverContent>
            </Popover>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function WorkspaceCalendar() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // 0 = Sunday
  const calendarStart = weekStart; // Start from today's week
  const calendarEnd = endOfWeek(addWeeks(weekStart, 3)); // Show 4 full weeks
  const [showWeekends, setShowWeekends] = useState(true);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // In a real app, you would fetch events based on the visible date range
  const [events] = useState(mockEvents);

  const getEventsForDay = (date: Date) => {
    // Only show events for today and future dates
    if (format(date, "yyyy-MM-dd") < format(today, "yyyy-MM-dd")) {
      return [];
    }
    return events.filter(
      (event) =>
        format(event.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
    );
  };

  const filteredDays = days.filter((day) => showWeekends || !isWeekend(day));
  const filteredWeekDays = showWeekends ? weekDays : weekDays.slice(1, 6);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Upcoming Events</h2>
        <div className="flex items-center gap-2">
          <Switch
            id="show-weekends"
            checked={showWeekends}
            onCheckedChange={setShowWeekends}
          />
          <label
            htmlFor="show-weekends"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Show weekends
          </label>
        </div>
      </div>

      <div
        className={`grid ${showWeekends ? "grid-cols-7" : "grid-cols-5"} gap-1`}
      >
        {filteredWeekDays.map((day) => (
          <div key={day} className="text-center font-semibold pb-2">
            {day}
          </div>
        ))}
        {filteredDays.map((day, i) => {
          const isPastDay =
            format(day, "yyyy-MM-dd") < format(today, "yyyy-MM-dd");
          const dayEvents = getEventsForDay(day);

          return (
            <div
              key={i}
              className={`min-h-[120px] border rounded-lg p-1 relative ${
                isWeekend(day) ? "bg-neutral-50" : "bg-white"
              } ${!isSameMonth(day, today) ? "opacity-50" : ""} ${
                isToday(day) ? "border-blue-500 border-2" : "border-gray-200"
              } ${isPastDay ? "invisible" : ""}`}
            >
              <div className="text-sm text-right mb-1 pr-1">
                {format(day, "d")}
              </div>
              <DayEvents date={day} events={dayEvents} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
