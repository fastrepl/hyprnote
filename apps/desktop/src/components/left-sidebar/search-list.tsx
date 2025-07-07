import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useMatch, useNavigate } from "@tanstack/react-router";
import { BuildingIcon, CalendarIcon, FileTextIcon, UserIcon } from "lucide-react";
import { AppWindowMacIcon } from "lucide-react";
import { useRef, useState } from "react";

import { useHyprSearch } from "@/contexts/search";
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

const highlightText = (text: string, query: string) => {
  if (!query.trim()) {
    return text;
  }

  const index = text.toLowerCase().indexOf(query.toLowerCase());

  if (index === -1) {
    return text;
  }

  return (
    <>
      {text.substring(0, index)}
      <mark className="bg-yellow-100 rounded-sm">
        {text.substring(index, index + query.length)}
      </mark>
      {text.substring(index + query.length)}
    </>
  );
};

export default function SearchList({ matches }: { matches: SearchMatch[] }) {
  const { selectedIndex, query } = useHyprSearch((s) => ({
    selectedIndex: s.selectedIndex,
    query: s.query,
  }));

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

  const getGlobalIndex = (sectionIndex: number, localIndex: number) => {
    let globalIndex = 0;
    if (sectionIndex >= 1) {
      globalIndex += sessionMatches.length;
    }
    if (sectionIndex >= 2) {
      globalIndex += eventMatches.length;
    }
    if (sectionIndex >= 3) {
      globalIndex += humanMatches.length;
    }
    return globalIndex + localIndex;
  };

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
              <SessionMatch
                key={`session-${match.item.id}`}
                match={match as SearchMatch & { type: "session" }}
                isSelected={selectedIndex === getGlobalIndex(0, i)}
                query={query}
              />
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
              <EventMatch
                key={`event-${match.item.id}`}
                match={match as SearchMatch & { type: "event" }}
                isSelected={selectedIndex === getGlobalIndex(1, i)}
                query={query}
              />
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
              <HumanMatch
                key={`human-${match.item.id}`}
                match={match as SearchMatch & { type: "human" }}
                isSelected={selectedIndex === getGlobalIndex(2, i)}
                query={query}
              />
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
              <OrganizationMatch
                key={`org-${match.item.id}`}
                match={match as SearchMatch & { type: "organization" }}
                isSelected={selectedIndex === getGlobalIndex(3, i)}
                query={query}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function SessionMatch({ match: { item: session }, isSelected, query }: {
  match: SearchMatch & { type: "session" };
  isSelected: boolean;
  query: string;
}) {
  const navigate = useNavigate();
  const elementRef = useRef<HTMLButtonElement>(null);

  const routeMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const isActive = routeMatch?.params.id === session.id;

  // Auto-scroll disabled
  // useEffect(() => {
  //   if (isSelected && elementRef.current) {
  //     elementRef.current.scrollIntoView({ block: "nearest" });
  //   }
  // }, [isSelected]);

  const handleClick = () => {
    navigate({
      to: "/app/note/$id",
      params: { id: session.id },
    });
  };

  return (
    <button
      ref={elementRef}
      onClick={handleClick}
      className={cn([
        "w-full text-left group flex items-start py-2 rounded-lg px-2",
        isActive ? "bg-neutral-200" : isSelected ? "bg-blue-100" : "hover:bg-neutral-100",
      ])}
    >
      <div className="flex flex-col items-start gap-1">
        <div className="font-medium text-sm line-clamp-1">
          {highlightText(session.title || "Untitled Note", query)}
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
          {new Date(session.created_at).toLocaleDateString()}
        </div>
      </div>
    </button>
  );
}

function EventMatch({ match, isSelected, query }: {
  match: SearchMatch & { type: "event" };
  isSelected: boolean;
  query: string;
}) {
  const navigate = useNavigate();
  const event = match.item;
  const elementRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll disabled
  // useEffect(() => {
  //   if (isSelected && elementRef.current) {
  //     elementRef.current.scrollIntoView({ block: "nearest" });
  //   }
  // }, [isSelected]);

  const handleClick = () => {
    navigate({ to: "/app/new", search: { calendarEventId: event.id } });
  };

  return (
    <button
      ref={elementRef}
      onClick={handleClick}
      className={cn([
        "w-full text-left group flex items-start py-2 rounded-lg px-2",
        isSelected ? "bg-blue-100" : "hover:bg-neutral-100",
      ])}
    >
      <div className="flex flex-col items-start gap-1">
        <div className="font-medium text-sm line-clamp-1">
          {highlightText(event.name, query)}
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
          {formatRemainingTime(new Date(event.start_date))}
        </div>
      </div>
    </button>
  );
}

function HumanMatch({ match: { item }, isSelected, query }: {
  match: SearchMatch & { type: "human" };
  isSelected: boolean;
  query: string;
}) {
  const navigate = useNavigate();
  const routeMatch = useMatch({ from: "/app/human/$id", shouldThrow: false });
  const [isOpen, setIsOpen] = useState(false);
  const elementRef = useRef<HTMLButtonElement>(null);

  const human = useQuery({
    initialData: item,
    queryKey: ["human", item.id],
    queryFn: () => dbCommands.getHuman(item.id),
  });

  const isActive = routeMatch?.params.id === item.id;

  // Auto-scroll disabled
  // useEffect(() => {
  //   if (isSelected && elementRef.current) {
  //     elementRef.current.scrollIntoView({ block: "nearest" });
  //   }
  // }, [isSelected]);

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
          ref={elementRef}
          onClick={handleClick}
          disabled={isActive}
          className={cn([
            "w-full text-left group flex items-start py-2 rounded-lg px-2",
            isActive ? "bg-neutral-200" : isSelected ? "bg-blue-100" : "hover:bg-neutral-100",
            isOpen && "bg-neutral-100",
          ])}
        >
          <div className="flex flex-col items-start gap-1">
            <div className="font-medium text-sm line-clamp-1 flex items-center gap-2 w-full">
              <span className="truncate">
                {highlightText(human.data?.full_name || "Unnamed Person", query)}
              </span>
              <span className="text-neutral-500 text-xs font-normal ml-auto truncate max-w-[120px]">
                {highlightText(human.data?.job_title || "", query)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
              {highlightText(human.data?.email || "", query)}
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

function OrganizationMatch({ match: { item: organization }, isSelected, query }: {
  match: SearchMatch & { type: "organization" };
  isSelected: boolean;
  query: string;
}) {
  const org = useQuery({
    initialData: organization,
    queryKey: ["org", organization.id],
    queryFn: () => dbCommands.getOrganization(organization.id),
  });

  const navigate = useNavigate();
  const routeMatch = useMatch({ from: "/app/organization/$id", shouldThrow: false });
  const [isOpen, setIsOpen] = useState(false);
  const elementRef = useRef<HTMLButtonElement>(null);

  const isActive = routeMatch?.params.id === organization.id;

  // Auto-scroll disabled
  // useEffect(() => {
  //   if (isSelected && elementRef.current) {
  //     elementRef.current.scrollIntoView({ block: "nearest" });
  //   }
  // }, [isSelected]);

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
          ref={elementRef}
          onClick={handleClick}
          disabled={isActive}
          className={cn([
            "w-full text-left group flex items-start py-2 rounded-lg px-2",
            isActive ? "bg-neutral-200" : isSelected ? "bg-blue-100" : "hover:bg-neutral-100",
            isOpen && "bg-neutral-100",
          ])}
        >
          <div className="flex flex-col items-start gap-1 w-full overflow-hidden">
            <div className="font-medium text-sm line-clamp-1 w-full">
              {highlightText(org.data?.name || "", query)}
            </div>
            <div className="text-xs text-neutral-500 truncate w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {highlightText(org.data?.description || "", query)}
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
