import {
  CalendarIcon,
  CircleMinus,
  CornerDownLeft,
  ExternalLinkIcon,
  MailIcon,
  MapPinIcon,
  SearchIcon,
  VideoIcon,
} from "lucide-react";
import { useState } from "react";

import { cn } from "../../lib/utils";
import { LinkedInIcon } from "../icons/linkedin";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

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

export interface MeetingMetadata {
  id: string;
  title: string;
  started_at: string;
  ended_at: string;
  location?: string | null;
  meeting_link?: string | null;
  description?: string | null;
  participants: MeetingParticipant[];
}

export interface MeetingParticipant {
  id: string;
  full_name?: string | null;
  email?: string | null;
  job_title?: string | null;
  linkedin_username?: string | null;
  organization?: {
    id: string;
    name: string;
  } | null;
}

export interface MeetingMetadataChipProps {
  metadata?: MeetingMetadata | null;
  isVeryNarrow?: boolean;
  isNarrow?: boolean;
  onJoinMeeting?: (meetingLink: string) => void;
  onParticipantClick?: (participant: MeetingParticipant) => void;
  onParticipantAdd?: (participantId: string) => void;
  onParticipantRemove?: (participantId: string) => void;
  participantSearchQuery?: string;
  onParticipantSearchChange?: (query: string) => void;
  participantSearchResults?: MeetingParticipant[];
  currentUserId?: string;
  formatRelativeDate?: (date: string) => string;
}

export function MeetingMetadataChip({
  metadata,
  onJoinMeeting,
  onParticipantClick,
  onParticipantAdd,
  onParticipantRemove,
  participantSearchQuery = "",
  onParticipantSearchChange,
  participantSearchResults = [],
  currentUserId,
}: MeetingMetadataChipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getMeetingDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  if (!metadata) {
    return (
      <Button
        disabled
        size="sm"
        variant="ghost"
      >
        <CalendarIcon size={14} className="shrink-0" />
        No event
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          className="max-w-28 text-color4"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          title={metadata.title}
        >
          <CalendarIcon size={16} className="shrink-0" />
          <p className="overflow-ellipsis truncate">{metadata.title}</p>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="shadow-lg w-72 relative">
        <div className="flex flex-col gap-3">
          <div className="font-semibold text-base">{metadata.title}</div>

          <div className="border-t border-neutral-200" />

          {metadata.location && (
            <>
              <div className="flex items-center gap-2">
                <MapPinIcon size={16} className="flex-shrink-0 text-color4" />
                <span className="text-sm text-color4 truncate">
                  {metadata.location}
                </span>
              </div>
              <div className="border-t border-neutral-200" />
            </>
          )}

          {metadata.meeting_link && (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <VideoIcon size={16} className="flex-shrink-0 text-color4" />
                  <span className="text-sm text-color4 truncate">
                    {getMeetingDomain(metadata.meeting_link)}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => onJoinMeeting?.(metadata.meeting_link!)}
                  className="flex-shrink-0 gap-1"
                >
                  Join
                  <ExternalLinkIcon size={14} />
                </Button>
              </div>
              <div className="border-t border-neutral-200" />
            </>
          )}

          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="flex-shrink-0 text-color4" />
            <span className="text-sm text-color4">
              {formatDateRange(metadata.started_at, metadata.ended_at)}
            </span>
          </div>

          <div className="border-t border-neutral-200" />

          <ParticipantsSection
            participants={metadata.participants}
            searchQuery={participantSearchQuery}
            searchResults={participantSearchResults}
            onSearchChange={onParticipantSearchChange}
            onParticipantAdd={onParticipantAdd}
            onParticipantClick={onParticipantClick}
            onParticipantRemove={onParticipantRemove}
            currentUserId={currentUserId}
          />

          {metadata.description && (
            <>
              <div className="border-t border-neutral-200" />
              <div className="text-sm text-color4 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                {metadata.description}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatTime = (date: Date) => formatDate(date, "p");
  const formatFullDate = (date: Date) => formatDate(date, "MMM d, yyyy");

  if (isSameDay(start, end)) {
    return `${formatFullDate(start)} ${formatTime(start)} to ${formatTime(end)}`;
  } else {
    return `${formatFullDate(start)} ${formatTime(start)} to ${formatFullDate(end)} ${formatTime(end)}`;
  }
}

interface ParticipantsSectionProps {
  participants: MeetingParticipant[];
  searchQuery: string;
  searchResults: MeetingParticipant[];
  onSearchChange?: (query: string) => void;
  onParticipantAdd?: (participantId: string) => void;
  onParticipantClick?: (participant: MeetingParticipant) => void;
  onParticipantRemove?: (participantId: string) => void;
  currentUserId?: string;
}

function ParticipantsSection({
  participants,
  searchQuery,
  searchResults,
  onSearchChange,
  onParticipantAdd,
  onParticipantClick,
  onParticipantRemove,
  currentUserId,
}: ParticipantsSectionProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchQuery.trim() || searchResults.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        handleSelectParticipant(searchResults[selectedIndex].id);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsFocused(false);
      onSearchChange?.("");
    }
  };

  const handleSelectParticipant = (participantId: string) => {
    onParticipantAdd?.(participantId);
    onSearchChange?.("");
    setSelectedIndex(-1);
    setIsFocused(true); // Keep focus on input
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium text-color3">Participants</div>

      {/* Existing Participants Chips */}
      {participants.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {participants.map((participant) => (
            <ParticipantChip
              key={participant.id}
              participant={participant}
              currentUserId={currentUserId}
              onClick={() => onParticipantClick?.(participant)}
              onRemove={() => onParticipantRemove?.(participant.id)}
            />
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded bg-neutral-50 border border-neutral-200 focus-within:border-neutral-300">
          <SearchIcon className="size-4 text-color4 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange?.(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Delay to allow click on results
              setTimeout(() => setIsFocused(false), 200);
            }}
            placeholder="Add participant"
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-color3"
          />
          {searchQuery.trim() && (
            <button
              onClick={() => {
                if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
                  handleSelectParticipant(searchResults[selectedIndex].id);
                }
              }}
              className="text-color4 hover:text-color4 transition-colors flex-shrink-0"
            >
              <CornerDownLeft className="size-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isFocused && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 flex flex-col w-full rounded border border-neutral-200 overflow-hidden bg-white shadow-md z-10 max-h-60 overflow-y-auto">
            {searchResults.length > 0
              ? (
                searchResults.map((participant, index) => (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={() => handleSelectParticipant(participant.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-sm text-left transition-colors w-full",
                      selectedIndex === index ? "bg-neutral-200" : "hover:bg-neutral-100",
                    )}
                  >
                    <span className="font-medium truncate">{participant.full_name || "Unknown"}</span>
                    {participant.organization?.name && (
                      <span className="text-xs text-color3 ml-2 flex-shrink-0">
                        {participant.organization.name}
                      </span>
                    )}
                  </button>
                ))
              )
              : (
                <div className="px-3 py-2 text-sm text-color3 text-center">
                  No matching participants found
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ParticipantChipProps {
  participant: MeetingParticipant;
  currentUserId?: string;
  onClick?: () => void;
  onRemove?: () => void;
}

function ParticipantChip({ participant, currentUserId, onClick, onRemove }: ParticipantChipProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = participant.full_name
    || (participant.id === currentUserId ? "You" : "Unknown");

  return (
    <div className="group relative inline-flex items-center gap-1.5 px-2 py-1 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors">
      <div className="flex items-center gap-1.5 cursor-pointer" onClick={onClick}>
        <Avatar className="size-5">
          <AvatarFallback className="text-[10px] bg-neutral-200 text-color4 font-medium">
            {participant.full_name ? getInitials(participant.full_name) : "?"}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium text-color4 max-w-[120px] truncate">
          {displayName}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {participant.email && (
          <a
            href={`mailto:${participant.email}`}
            onClick={(e) => e.stopPropagation()}
            className="text-color3 transition-colors hover:text-color4 opacity-0 group-hover:opacity-100"
          >
            <MailIcon className="size-3" />
          </a>
        )}
        {participant.linkedin_username && (
          <a
            href={`https://linkedin.com/in/${participant.linkedin_username}`}
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-color3 transition-colors hover:text-color4 opacity-0 group-hover:opacity-100"
          >
            <LinkedInIcon className="size-3" />
          </a>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
        >
          <CircleMinus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
