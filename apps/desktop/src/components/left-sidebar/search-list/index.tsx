import { useNavigate } from "@tanstack/react-router";
import { BuildingIcon, CalendarIcon, FileTextIcon, UserIcon } from "lucide-react";

import { type SearchMatch } from "@/stores/search";
import { formatRemainingTime } from "@hypr/utils/datetime";

export default function SearchList({ matches }: { matches: SearchMatch[] }) {
  if (matches.length === 0) {
    return (
      <div className="py-4 text-center text-neutral-500 text-sm">
        No results found
      </div>
    );
  }

  // Group matches by type
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

function SessionMatch({ match }: { match: SearchMatch & { type: "session" } }) {
  const navigate = useNavigate();
  const session = match.item;

  const handleClick = () => {
    navigate({
      to: "/app/note/$id",
      params: { id: session.id },
    });
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left group flex items-start py-2 hover:bg-neutral-100 rounded-lg px-2"
    >
      <div className="flex flex-col items-start gap-1">
        <div className="font-medium text-sm line-clamp-1">{session.title || "Untitled Note"}</div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
          <span>Note • {new Date(session.created_at).toLocaleDateString()}</span>
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
          <span>Event • {formatRemainingTime(new Date(event.start_date))}</span>
        </div>
      </div>
    </button>
  );
}

function HumanMatch({ match }: { match: SearchMatch & { type: "human" } }) {
  const navigate = useNavigate();
  const human = match.item;

  const handleClick = () => {
    navigate({
      to: "/app/human/$id",
      params: { id: human.id },
    });
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left group flex items-start py-2 hover:bg-neutral-100 rounded-lg px-2"
    >
      <div className="flex flex-col items-start gap-1">
        <div className="font-medium text-sm line-clamp-1">{human.full_name || "Unnamed Person"}</div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
          <span>Person • {human.email || human.job_title || "No details"}</span>
        </div>
      </div>
    </button>
  );
}

function OrganizationMatch({ match }: { match: SearchMatch & { type: "organization" } }) {
  const navigate = useNavigate();
  const organization = match.item;

  const handleClick = () => {
    navigate({
      to: "/app/organization/$id",
      params: { id: organization.id },
    });
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left group flex items-start py-2 hover:bg-neutral-100 rounded-lg px-2"
    >
      <div className="flex flex-col items-start gap-1">
        <div className="font-medium text-sm line-clamp-1">{organization.name}</div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
          <span>Organization • {organization.description || "No description"}</span>
        </div>
      </div>
    </button>
  );
}
