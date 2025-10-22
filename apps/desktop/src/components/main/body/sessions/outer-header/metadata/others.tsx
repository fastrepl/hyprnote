import { Icon } from "@iconify-icon/react";
import { CheckIcon, MailIcon, MinusCircleIcon, SearchIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@hypr/ui/components/ui/hover-card";
import { cn } from "@hypr/utils";
import { getInitials } from "../../../contacts/shared";

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

function ParticipantChip({
  participant,
  attended = true,
  onRemove,
}: {
  participant: MeetingParticipant;
  attended?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}) {
  const displayName = participant.full_name;

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div className="group inline-flex items-center gap-1.5 px-1 py-0.5 bg-neutral-200 rounded-md hover:bg-neutral-200 transition-colors cursor-pointer">
          <p className="text-[12px] font-medium text-neutral-700 max-w-[120px] truncate hover:underline hover:decoration-dotted">
            {displayName}
          </p>

          <div className="flex items-center">
            <div className="group-hover:hidden">
              {attended
                ? <CheckIcon className="size-3.5 text-green-600" />
                : <XIcon className="size-3.5 text-red-500" />}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
              className="hidden group-hover:block text-neutral-500 hover:text-red-600 transition-colors"
            >
              <MinusCircleIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="top">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Avatar className="size-12">
              <AvatarFallback className="text-sm bg-neutral-200 text-neutral-700 font-medium">
                {participant.full_name ? getInitials(participant.full_name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="font-semibold text-sm">{displayName}</div>
              {participant.job_title && <div className="text-xs text-neutral-600">{participant.job_title}</div>}
              {participant.organization?.name && (
                <div className="text-xs text-neutral-500">{participant.organization.name}</div>
              )}
            </div>
          </div>
          {(participant.email || participant.linkedin_username) && (
            <div className="flex flex-col gap-2 pt-2 border-t border-neutral-200">
              {participant.email && (
                <a
                  href={`mailto:${participant.email}`}
                  className="flex items-center gap-2 text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <MailIcon className="size-3.5" />
                  {participant.email}
                </a>
              )}
              {participant.linkedin_username && (
                <a
                  href={`https://linkedin.com/in/${participant.linkedin_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <Icon icon="logos:linkedin-icon" className="size-3.5" />
                  linkedin.com/in/{participant.linkedin_username}
                </a>
              )}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

interface ParticipantsSectionProps {
  participants: MeetingParticipant[];
  searchQuery: string;
  searchResults: MeetingParticipant[];
  onSearchChange?: (query: string) => void;
  onParticipantAdd?: (participantId: string) => void;
  onParticipantClick?: (participant: MeetingParticipant) => void;
  onParticipantRemove?: (participantId: string) => void;
}

export function ParticipantsSection({
  participants,
  searchQuery,
  searchResults,
  onSearchChange,
  onParticipantAdd,
  onParticipantClick,
  onParticipantRemove,
}: ParticipantsSectionProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // TODO: sort participants based on attendance
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((_, __) => {
      return 0;
    });
  }, [participants]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !searchQuery && sortedParticipants.length > 0) {
      e.preventDefault();
      onParticipantRemove?.(sortedParticipants[sortedParticipants.length - 1].id);
      return;
    }

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
    setIsFocused(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium text-neutral-500">Participants</div>
      <div className="relative">
        <div
          className={cn(
            "flex flex-wrap items-center w-full px-2 py-1.5 gap-1.5 rounded bg-neutral-50 border border-neutral-200 focus-within:border-neutral-300 min-h-[36px]",
            isFocused && "border-neutral-300",
          )}
          onClick={() => document.getElementById("participant-search-input")?.focus()}
        >
          {sortedParticipants.map((participant) => (
            <ParticipantChip
              key={participant.id}
              participant={participant}
              onClick={() => onParticipantClick?.(participant)}
              onRemove={() => onParticipantRemove?.(participant.id)}
            />
          ))}
          {sortedParticipants.length === 0 && <SearchIcon className="size-4 text-neutral-700 flex-shrink-0" />}
          <input
            id="participant-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange?.(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 200);
            }}
            placeholder={sortedParticipants.length === 0 ? "Add participant" : ""}
            className="flex-1 min-w-[120px] bg-transparent text-sm focus:outline-none placeholder:text-neutral-500"
          />
        </div>

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
                      <span className="text-xs text-neutral-500 ml-2 flex-shrink-0">
                        {participant.organization.name}
                      </span>
                    )}
                  </button>
                ))
              )
              : (
                <div className="px-3 py-2 text-sm text-neutral-500 text-center">
                  No matching participants found
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
