import { CircleMinus, CornerDownLeft, MailIcon, SearchIcon, Users2Icon } from "lucide-react";
import { cn } from "../../lib/utils";
import { LinkedInIcon } from "../icons/linkedin";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export interface Participant {
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

export interface ParticipantGroup {
  organization: { id: string; name: string } | null;
  participants: Participant[];
}

interface ParticipantsChipProps {
  participants: ParticipantGroup[];
  currentUserId?: string;
  isVeryNarrow?: boolean;
  isNarrow?: boolean;
  onParticipantClick?: (participant: Participant) => void;
  onParticipantRemove?: (participantId: string) => void;
  onParticipantAdd?: (query: string) => void;
  onParticipantSelect?: (participantId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchResults?: Participant[];
  allowMutate?: boolean;
}

export function ParticipantsChip({
  participants,
  currentUserId,
  isVeryNarrow = false,
  isNarrow = false,
  onParticipantClick,
  onParticipantRemove,
  onParticipantAdd,
  onParticipantSelect,
  searchQuery = "",
  onSearchChange,
  searchResults = [],
  allowMutate = true,
}: ParticipantsChipProps) {
  const count = participants.reduce((acc, group) => acc + group.participants.length, 0);

  const getButtonText = () => {
    if (count === 0) {
      return isVeryNarrow ? "Add" : isNarrow ? "Add people" : "Add participants";
    }

    if (isVeryNarrow || isNarrow) {
      return count.toString();
    }

    const firstParticipant = participants.find(g => g.participants.length > 0)?.participants[0];
    if (!firstParticipant) {
      return "Add participants";
    }

    if (firstParticipant.id === currentUserId && !firstParticipant.full_name) {
      return "You";
    }

    return firstParticipant.full_name || "??";
  };

  return (
    <Popover>
      <PopoverTrigger>
        <div
          className={cn(
            "flex flex-row items-center gap-1 rounded-md hover:bg-neutral-100 text-xs py-1.5",
            isVeryNarrow ? "px-1.5" : "px-2",
          )}
        >
          <Users2Icon size={14} className="flex-shrink-0 text-color4" />
          <span className="truncate text-color4">{getButtonText()}</span>
          {count > 1 && !isVeryNarrow && !isNarrow && <span className="text-color3">+ {count - 1}</span>}
        </div>
      </PopoverTrigger>

      <PopoverContent className="shadow-lg w-80" align="end">
        {participants.length === 0 && allowMutate
          ? (
            <AddParticipantInput
              value={searchQuery}
              onChange={onSearchChange}
              onSubmit={onParticipantAdd}
              searchResults={searchResults}
              onSelectResult={onParticipantSelect}
            />
          )
          : (
            <div className="flex flex-col gap-3">
              <ParticipantList
                participants={participants}
                currentUserId={currentUserId}
                onParticipantClick={onParticipantClick}
                onParticipantRemove={onParticipantRemove}
                allowMutate={allowMutate}
              />
              {allowMutate && (
                <AddParticipantInput
                  value={searchQuery}
                  onChange={onSearchChange}
                  onSubmit={onParticipantAdd}
                  searchResults={searchResults}
                  onSelectResult={onParticipantSelect}
                />
              )}
            </div>
          )}
      </PopoverContent>
    </Popover>
  );
}

function ParticipantList({
  participants,
  currentUserId,
  onParticipantClick,
  onParticipantRemove,
  allowMutate,
}: {
  participants: ParticipantGroup[];
  currentUserId?: string;
  onParticipantClick?: (participant: Participant) => void;
  onParticipantRemove?: (participantId: string) => void;
  allowMutate?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 max-h-[40vh] overflow-y-auto pr-1">
      {participants.map((group, index) => (
        <div key={group.organization?.id ?? `no-org-${index}`} className="flex flex-col gap-1.5">
          <div className="text-xs font-medium text-color3 truncate">
            {group.organization?.name || "No organization"}
          </div>
          <div className="flex flex-col rounded-md overflow-hidden bg-neutral-50 border border-neutral-100">
            {group.participants.map((participant) => (
              <ParticipantItem
                key={participant.id}
                participant={participant}
                currentUserId={currentUserId}
                onClick={() => onParticipantClick?.(participant)}
                onRemove={() =>
                  onParticipantRemove?.(participant.id)}
                allowRemove={allowMutate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ParticipantItem({
  participant,
  currentUserId,
  onClick,
  onRemove,
  allowRemove,
}: {
  participant: Participant;
  currentUserId?: string;
  onClick?: () => void;
  onRemove?: () => void;
  allowRemove?: boolean;
}) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className="flex items-center justify-between gap-2 py-2 px-3 hover:bg-neutral-100 cursor-pointer group transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5 relative min-w-0">
        <div className="relative size-7 flex items-center justify-center flex-shrink-0">
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity",
              allowRemove && "group-hover:opacity-0",
            )}
          >
            <Avatar className="size-7">
              <AvatarFallback className="text-xs bg-neutral-200 text-color4 font-medium">
                {participant.full_name ? getInitials(participant.full_name) : "?"}
              </AvatarFallback>
            </Avatar>
          </div>
          {allowRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
              className="flex items-center justify-center text-red-400 hover:text-red-600 absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm"
            >
              <CircleMinus className="size-4" />
            </button>
          )}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium text-color4 truncate">
            {participant.full_name || (participant.id === currentUserId ? "You" : "Unknown")}
          </span>
          {participant.job_title && <span className="text-xs text-color3 truncate">{participant.job_title}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 transition-colors flex-shrink-0">
        {participant.email && (
          <a
            href={`mailto:${participant.email}`}
            onClick={(e) => e.stopPropagation()}
            className="text-color3 transition-colors hover:text-color4 p-1 rounded-full hover:bg-neutral-200"
          >
            <MailIcon className="size-3.5" />
          </a>
        )}
        {participant.linkedin_username && (
          <a
            href={`https://linkedin.com/in/${participant.linkedin_username}`}
            onClick={(e) => e.stopPropagation()}
            className="text-color3 transition-colors hover:text-color4 p-1 rounded-full hover:bg-neutral-200"
          >
            <LinkedInIcon className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function AddParticipantInput({
  value,
  onChange,
  onSubmit,
  searchResults,
  onSelectResult,
}: {
  value: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  searchResults?: Participant[];
  onSelectResult?: (participantId: string) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) {
          onSubmit?.(value.trim());
        }
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded bg-neutral-50 border border-neutral-200">
          <SearchIcon className="size-4 text-color4 flex-shrink-0" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder="Find person"
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-color3"
          />
          {value.trim() && (
            <button
              type="submit"
              className="text-color4 hover:text-color4 transition-colors flex-shrink-0"
            >
              <CornerDownLeft className="size-4" />
            </button>
          )}
        </div>

        {value.trim() && searchResults && (
          <div className="flex flex-col w-full rounded border border-neutral-200 overflow-hidden">
            {searchResults.map((participant) => (
              <button
                key={participant.id}
                type="button"
                onClick={() => onSelectResult?.(participant.id)}
                className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
              >
                <span className="font-medium truncate">{participant.full_name}</span>
                {participant.organization?.name && (
                  <span className="text-xs text-color3 ml-auto">
                    {participant.organization.name}
                  </span>
                )}
              </button>
            ))}
            {searchResults.length === 0 && (
              <button
                type="submit"
                className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
              >
                <span className="flex items-center gap-1 font-medium text-color4">
                  Create <span className="text-color4">"{value.trim()}"</span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
