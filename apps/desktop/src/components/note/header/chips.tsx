import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RiLinkedinBoxFill } from "@remixicon/react";
import { Check, TagIcon, Users2Icon, CalendarIcon, Mail } from "lucide-react";
import { toast } from "sonner";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import { Input } from "@hypr/ui/components/ui/input";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Button } from "@hypr/ui/components/ui/button";
import { useSession } from "@/contexts";

import { commands as dbCommands, type Human, type Tag } from "@hypr/plugin-db";

export default function Chips() {
  return (
    <div className="-mx-1.5 flex flex-row items-center sm:px-8 px-4 pb-4 pt-1 overflow-x-auto scrollbar-none whitespace-nowrap">
      <EventChip />
      <div className="mx-1 h-4 w-px flex-shrink-0 bg-border" />
      <ParticipantsChip />
      <div className="mx-1 h-4 w-px flex-shrink-0 bg-border" />
      <TagChips />
    </div>
  );
}

export function EventChip() {
  const session = useSession((s) => s.session);

  const event = useQuery({
    enabled: !!session?.id,
    queryKey: ["event", session.id],
    queryFn: () => dbCommands.sessionGetEvent(session.id),
  });

  return (
    <Popover>
      <PopoverTrigger disabled={!event.data}>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100">
          <CalendarIcon size={14} />
          <p className="text-xs">
            {event.data?.start_date} - {event.data?.end_date}
          </p>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="shadow-lg">
        <div className="flex flex-col gap-2">
          <div className="font-semibold">{event.data?.name}</div>
          <div className="text-sm text-neutral-600">{event.data?.note}</div>
          <Button variant="outline">View in calendar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ParticipantsChip() {
  const session = useSession((s) => s.session);
  const participants = useQuery({
    enabled: !!session?.id,
    queryKey: ["participants", session.id],
    queryFn: () => dbCommands.sessionListParticipants(session.id),
  });

  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 text-xs">
          <Users2Icon size={14} />
          {participants.data?.length && participants.data.length > 2 && (
            <div>
              {participants.data[0].full_name} + {participants.data.length - 1}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="shadow-lg"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ParticipantsList participants={participants.data ?? []} />
      </PopoverContent>
    </Popover>
  );
}

function ParticipantsList({ participants }: { participants: Human[] }) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const groupedParticipants = useMemo(() => {
    const groups: Record<string, Human[]> = {
      "No Organization": [],
    };

    participants.forEach((participant) => {
      const orgId = participant.organization_id || "No Organization";
      if (!groups[orgId]) {
        groups[orgId] = [];
      }
      groups[orgId].push(participant);
    });

    return groups;
  }, [participants]);

  return (
    <div className="space-y-2">
      {Object.entries(groupedParticipants).map(([orgId, members]) => (
        <div key={orgId} className="space-y-1">
          <div className="pb-1">
            <p className="text-xs font-medium text-neutral-500">
              {orgId === "No Organization" ? "Others" : orgId}
            </p>
          </div>
          <div className="space-y-0.5">
            {members.map((member) => (
              <div
                key={member.id}
                tabIndex={-1}
                className="flex w-full items-start justify-between rounded py-2 text-sm"
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      className="size-6"
                      style={{ backgroundColor: "gray" }}
                    >
                      <AvatarFallback className="text-xs">
                        {getInitials(member.full_name ?? "UNKNOWN")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col">
                      <span className="font-medium">{member.full_name}</span>
                      {member.job_title && (
                        <span className="text-xs text-neutral-500">
                          {member.job_title}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!member.linkedin_username && (
                      <a
                        href={`https://linkedin.com/in/${member.linkedin_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <RiLinkedinBoxFill className="size-5 text-neutral-400 transition-colors hover:text-neutral-600" />
                      </a>
                    )}
                    {member.email && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(member.email!);
                            toast.success("Email copied to clipboard");
                          } catch (err) {
                            toast.error("Failed to copy email");
                          }
                        }}
                        className="text-neutral-400 transition-colors hover:text-neutral-600"
                        title={member.email}
                      >
                        <Mail className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TagChips() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");

  const sessionStore = useSession((s) => s.session);

  const tags = useQuery({
    queryKey: ["tags"],
    enabled: !!sessionStore?.id,
    queryFn: () => {
      const id = sessionStore.id;
      return dbCommands.listSessionTags(id);
    },
  });

  const toggleTag = (tag: Tag) => {
    const isSelected = selected.some((t) => t.id === tag.id);
    if (isSelected) {
      setSelected(selected.filter((t) => t.id !== tag.id));
    } else {
      setSelected([...selected, tag]);
    }
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;

    const newTag: Tag = {
      id: String(Date.now()),
      name: newTagName.trim(),
    };

    setSelected([...selected, newTag]);
    setNewTagName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateTag();
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setNewTagName("");
        }
      }}
    >
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 flex-shrink-0 text-xs">
          <TagIcon size={14} className="flex-shrink-0" />
          {selected.length > 0 ? (
            <span className="truncate">
              {selected[0]?.name}
              {selected.length > 1 && ` +${selected.length - 1}`}
            </span>
          ) : (
            <span className="truncate">Add tags</span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="overflow-clip p-0 py-2 shadow-lg"
        align="start"
      >
        <div className="space-y-1">
          {tags.data?.map((tag) => {
            const isSelected = selected.some((t) => t.id === tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-neutral-100"
              >
                <div className="rounded px-2 py-0.5 text-sm">{tag.name}</div>
                {isSelected && <Check className="ml-auto h-4 w-4" />}
              </button>
            );
          })}

          {tags.data?.length && (
            <div className="my-2 border-t border-gray-200" />
          )}

          <div className="relative pl-1">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Create new tag..."
              className="rounded-none border-none pr-8 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0"
            />
            {newTagName.trim() && (
              <Button
                onClick={handleCreateTag}
                className="absolute right-2 top-1/2 -translate-y-1/2 transform rounded-full bg-white p-1 text-green-500 transition ease-in-out hover:bg-green-500 hover:text-white"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
