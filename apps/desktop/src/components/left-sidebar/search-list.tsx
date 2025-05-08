import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useMatch, useNavigate } from "@tanstack/react-router";
import { BuildingIcon, CalendarIcon, FileTextIcon, UserIcon } from "lucide-react";
import { AppWindowMacIcon } from "lucide-react";
import { useState } from "react";

import { type SearchMatch } from "@/stores/search";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@hypr/ui/components/ui/context-menu";
import { cn } from "@hypr/ui/lib/utils";
import { formatRemainingTime } from "@hypr/utils/datetime";

export default function SearchList({ matches }: { matches: SearchMatch[] }) {
  if (matches.length === 0) {
    return (
      <div className="py-4 text-center text-neutral-500 text-sm">
        No results found
      </div>
    );
  }

  const sessionMatches = matches.filter(match => match.type === "session");
  const eventMatches = matches.filter(match => match.type === "event");
  const humanMatches = matches.filter(match => match.type === "human");
  const organizationMatches = matches.filter(match => match.type === "organization");

  return (
    <div className="h-full space-y-4 px-3 pb-4">
      {sessionMatches.length > 0 && (
        <section>
          <h2 className="font-bold text-neutral-600 mb-1 flex items-center gap-1">
            <FileTextIcon className="h-4 w-4 text-neutral-500" />
            Notes
          </h2>
          <div>
            {sessionMatches.map((match, i) => (
              <SessionMatch key={`session-${i}`} match={match as SearchMatch & { type: "session" }} />
            ))}
          </div>
        </section>
      )}

      {eventMatches.length > 0 && (
        <section>
          <h2 className="font-bold text-neutral-600 mb-1 flex items-center gap-1">
            <CalendarIcon className="h-4 w-4 text-neutral-500" />
            Events
          </h2>
          <div>
            {eventMatches.map((match, i) => (
              <EventMatch key={`event-${i}`} match={match as SearchMatch & { type: "event" }} />
            ))}
          </div>
        </section>
      )}

      {humanMatches.length > 0 && (
        <section>
          <h2 className="font-bold text-neutral-600 mb-1 flex items-center gap-1">
            <UserIcon className="h-4 w-4 text-neutral-500" />
            People
          </h2>
          <div>
            {humanMatches.map((match, i) => (
              <HumanMatch key={`human-${i}`} match={match as SearchMatch & { type: "human" }} />
            ))}
          </div>
        </section>
      )}

      {organizationMatches.length > 0 && (
        <section>
          <h2 className="font-bold text-neutral-600 mb-1 flex items-center gap-1">
            <BuildingIcon className="h-4 w-4 text-neutral-500" />
            Organizations
          </h2>
          <div>
            {organizationMatches.map((match, i) => (
              <OrganizationMatch key={`org-${i}`} match={match as SearchMatch & { type: "organization" }} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function SessionMatch({ match: { item: session } }: { match: SearchMatch & { type: "session" } }) {
  const navigate = useNavigate();

  const match = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const isActive = match?.params.id === session.id;

  const handleClick = () => {
    navigate({
      to: "/app/note/$id",
      params: { id: session.id },
    });
  };

  return (
    <button
      onClick={handleClick}
      className={cn([
        "w-full text-left group flex items-start py-2 rounded-lg px-2",
        isActive ? "bg-neutral-200" : "hover:bg-neutral-100",
      ])}
    >
      <div className="flex flex-col items-start gap-1">
        <div className="font-medium text-sm line-clamp-1">{session.title || "Untitled Note"}</div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
          {new Date(session.created_at).toLocaleDateString()}
        </div>
      </div>
    </button>
  );
}

function EventMatch({ match }: { match: SearchMatch & { type: "event" } }) {
  const navigate = useNavigate();
  const event = match.item;

  const handleClick = () => {
    navigate({ to: "/app/new", search: { calendarEventId: event.id } });
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left group flex items-start py-2 hover:bg-neutral-100 rounded-lg px-2"
    >
      <div className="flex flex-col items-start gap-1">
        <div className="font-medium text-sm line-clamp-1">{event.name}</div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
          {formatRemainingTime(new Date(event.start_date))}
        </div>
      </div>
    </button>
  );
}

function HumanMatch({ match: { item } }: { match: SearchMatch & { type: "human" } }) {
  const navigate = useNavigate();
  const match = useMatch({ from: "/app/human/$id", shouldThrow: false });
  const [isOpen, setIsOpen] = useState(false);

  const human = useQuery({
    initialData: item,
    queryKey: ["human", item.id],
    queryFn: () => dbCommands.getHuman(item.id),
  });

  const isActive = match?.params.id === item.id;

  const handleClick = () => {
    navigate({
      to: "/app/human/$id",
      params: { id: item.id },
    });
  };

  const handleOpenWindow = () => {
    windowsCommands.windowShow({ type: "human", value: item.id });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <ContextMenu onOpenChange={handleOpenChange}>
      <ContextMenuTrigger disabled={isActive}>
        <button
          onClick={handleClick}
          disabled={isActive}
          className={cn([
            "w-full text-left group flex items-start py-2 rounded-lg px-2",
            isActive ? "bg-neutral-200" : "hover:bg-neutral-100",
            isOpen && "bg-neutral-100",
          ])}
        >
          <div className="flex flex-col items-start gap-1">
            <div className="font-medium text-sm line-clamp-1 flex items-center gap-2 w-full">
              <span className="truncate">{human.data?.full_name || "Unnamed Person"}</span>
              <span className="text-neutral-500 text-xs font-normal ml-auto truncate max-w-[120px]">
                {human.data?.job_title}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
              {human.data?.email}
            </div>
          </div>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem
          className="cursor-pointer"
          onClick={handleOpenWindow}
        >
          <AppWindowMacIcon size={16} className="mr-2" />
          <Trans>Open in new window</Trans>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function OrganizationMatch(
  { match: { item: organization } }: { match: SearchMatch & { type: "organization" } },
) {
  const org = useQuery({
    initialData: organization,
    queryKey: ["org", organization.id],
    queryFn: () => dbCommands.getOrganization(organization.id),
  });

  const navigate = useNavigate();
  const match = useMatch({ from: "/app/organization/$id", shouldThrow: false });
  const [isOpen, setIsOpen] = useState(false);

  const isActive = match?.params.id === organization.id;

  const handleClick = () => {
    navigate({
      to: "/app/organization/$id",
      params: { id: organization.id },
    });
  };

  const handleOpenWindow = () => {
    windowsCommands.windowShow({ type: "organization", value: organization.id });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <ContextMenu onOpenChange={handleOpenChange}>
      <ContextMenuTrigger disabled={isActive}>
        <button
          onClick={handleClick}
          disabled={isActive}
          className={cn([
            "w-full text-left group flex items-start py-2 rounded-lg px-2",
            isActive ? "bg-neutral-200" : "hover:bg-neutral-100",
            isOpen && "bg-neutral-100",
          ])}
        >
          <div className="flex flex-col items-start gap-1 w-full overflow-hidden">
            <div className="font-medium text-sm line-clamp-1 w-full">{org.data?.name}</div>
            <div className="text-xs text-neutral-500 truncate w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {org.data?.description}
            </div>
          </div>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem
          className="cursor-pointer"
          onClick={handleOpenWindow}
        >
          <AppWindowMacIcon size={16} className="mr-2" />
          <Trans>Open in new window</Trans>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
