import { CalendarIcon, SearchIcon, SpeechIcon, VideoIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const formatDate = (date: Date, format: string): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const replacements: Record<string, string> = {
    "yyyy": date.getFullYear().toString(),
    "MMM": months[date.getMonth()],
    "MM": pad(date.getMonth() + 1),
    "d": date.getDate().toString(),
    "dd": pad(date.getDate()),
    "EEE": days[date.getDay()],
    "h": (date.getHours() % 12 || 12).toString(),
    "mm": pad(date.getMinutes()),
    "a": date.getHours() >= 12 ? "PM" : "AM",
    "p": `${date.getHours() % 12 || 12}:${pad(date.getMinutes())} ${date.getHours() >= 12 ? "PM" : "AM"}`,
  };

  return format.replace(/yyyy|MMM|MM|dd|EEE|h|mm|a|p|d/g, (token) => replacements[token]);
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear()
    && date1.getMonth() === date2.getMonth()
    && date1.getDate() === date2.getDate();
};

export interface Event {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  note?: string;
  meetingLink?: string | null;
  calendar_id?: string;
}

export interface EventChipProps {
  event?: Event | null;
  date: string;
  isVeryNarrow?: boolean;
  isNarrow?: boolean;
  onEventSelect?: (eventId: string) => void;
  onEventDetach?: () => void;
  onDateChange?: (date: Date) => void;
  onJoinMeeting?: (meetingLink: string) => void;
  onViewInCalendar?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchResults?: Event[];
  formatRelativeDate?: (date: string) => string;
}

export function EventChip({
  event,
  date,
  isVeryNarrow = false,
  onEventSelect,
  onEventDetach,
  onDateChange,
  onJoinMeeting,
  onViewInCalendar,
  searchQuery = "",
  onSearchChange,
  searchResults = [],
  formatRelativeDate = (d) => formatDate(new Date(d), "MMM d"),
}: EventChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"event" | "date">("event");

  const getIcon = () => {
    if (event?.meetingLink) {
      return <VideoIcon size={14} />;
    }
    if (event) {
      return <SpeechIcon size={14} />;
    }
    return <CalendarIcon size={14} />;
  };

  const handleEventSelect = (eventId: string) => {
    onEventSelect?.(eventId);
    setIsOpen(false);
  };

  const handleEventDetach = () => {
    onEventDetach?.();
    setIsOpen(false);
  };

  const handleDateChange = (date: Date) => {
    onDateChange?.(date);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex flex-row items-center gap-1 rounded-md cursor-pointer",
            isVeryNarrow ? "px-1.5 py-1" : "px-2 py-1.5",
            "hover:bg-neutral-100",
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          title={formatDate(new Date(event?.start_date || date), "EEE, MMM d, yyyy") + " at "
            + formatDate(new Date(event?.start_date || date), "h:mm a")}
        >
          <span className="flex-shrink-0 text-neutral-700">{getIcon()}</span>
          {!isVeryNarrow && (
            <p className="text-xs truncate text-neutral-700">
              {formatRelativeDate(event?.start_date || date)}
            </p>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent align="end" className="shadow-lg w-80 relative">
        {event
          ? (
            <EventDetails
              event={event}
              onDetach={handleEventDetach}
              onJoinMeeting={onJoinMeeting}
              onViewInCalendar={onViewInCalendar}
              formatRelativeDate={formatRelativeDate}
            />
          )
          : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "event" | "date")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="event">Add Event</TabsTrigger>
                <TabsTrigger value="date">Change Date</TabsTrigger>
              </TabsList>

              <TabsContent value="event" className="mt-4">
                <EventSearch
                  searchQuery={searchQuery}
                  onSearchChange={onSearchChange}
                  searchResults={searchResults}
                  onEventSelect={handleEventSelect}
                />
              </TabsContent>

              <TabsContent value="date" className="mt-4">
                <DatePicker
                  currentDate={date}
                  onDateChange={handleDateChange}
                />
              </TabsContent>
            </Tabs>
          )}
      </PopoverContent>
    </Popover>
  );
}

function EventDetails({
  event,
  onDetach,
  onJoinMeeting,
  onViewInCalendar,
  formatRelativeDate,
}: {
  event: Event;
  onDetach?: () => void;
  onJoinMeeting?: (meetingLink: string) => void;
  onViewInCalendar?: () => void;
  formatRelativeDate: (date: string) => string;
}) {
  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);

  const getDateString = () => {
    const formattedStart = formatRelativeDate(event.start_date);
    const startTime = formatDate(startDate, "p");
    const endTime = formatDate(endDate, "p");

    if (isSameDay(startDate, endDate)) {
      return `${formattedStart}, ${startTime} - ${endTime}`;
    } else {
      const formattedEnd = formatRelativeDate(event.end_date);
      return `${formattedStart}, ${startTime} - ${formattedEnd}, ${endTime}`;
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {onDetach && (
        <button
          onClick={onDetach}
          className="absolute top-4 right-4 p-1 bg-red-100 text-white rounded-full hover:bg-red-500 transition-colors z-10"
          aria-label="Detach event"
        >
          <XIcon size={12} />
        </button>
      )}

      <div className="font-semibold pr-8">{event.name}</div>
      <div className="text-sm text-neutral-700">{getDateString()}</div>

      <div className="flex gap-2">
        {event.meetingLink && onJoinMeeting && (
          <Button
            onClick={() => onJoinMeeting(event.meetingLink!)}
            className="flex-1"
          >
            <VideoIcon size={16} className="mr-1" />
            Join meeting
          </Button>
        )}

        {onViewInCalendar && (
          <Button
            variant="outline"
            onClick={onViewInCalendar}
            className="flex-1"
          >
            View in calendar
          </Button>
        )}
      </div>

      {event.note && (
        <div className="border-t pt-2 text-sm text-neutral-700 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
          {event.note}
        </div>
      )}
    </div>
  );
}

function EventSearch({
  searchQuery,
  onSearchChange,
  searchResults,
  onEventSelect,
}: {
  searchQuery: string;
  onSearchChange?: (query: string) => void;
  searchResults: Event[];
  onEventSelect?: (eventId: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded-md bg-neutral-50 border border-neutral-200 mb-2">
        <SearchIcon className="size-4 text-neutral-700 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search past events..."
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full bg-transparent text-sm focus:outline-none placeholder:text-color3"
        />
      </div>

      {searchResults.length === 0
        ? (
          <div className="p-4 text-center text-sm text-neutral-700">
            {searchQuery ? "No matching events found." : "No past events available."}
          </div>
        )
        : (
          <div className="max-h-60 overflow-y-auto">
            {searchResults.map((event) => (
              <button
                key={event.id}
                onClick={() => onEventSelect?.(event.id)}
                className="flex flex-col items-start p-2 hover:bg-neutral-100 text-left w-full rounded-md transition-colors"
              >
                <p className="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap w-full">
                  {event.name}
                </p>
                <p className="text-xs text-neutral-700">
                  {formatDate(new Date(event.start_date), "MMM d, yyyy")}
                </p>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}

function DatePicker({
  currentDate,
  onDateChange,
}: {
  currentDate: string;
  onDateChange?: (date: Date) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(currentDate);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (dateStr) {
      setSelectedDate(dateStr);
    }
  };

  const handleSave = () => {
    const newDate = new Date(selectedDate);
    if (!isNaN(newDate.getTime())) {
      onDateChange?.(newDate);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="date"
        value={formatDate(new Date(selectedDate), "yyyy-MM-dd")}
        onChange={handleDateChange}
        max={formatDate(new Date(), "yyyy-MM-dd")}
        className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none"
      />

      <Button
        onClick={handleSave}
        className="w-full"
      >
        Save Date
      </Button>
    </div>
  );
}
