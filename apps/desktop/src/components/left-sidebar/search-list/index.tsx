import { BuildingIcon, CalendarIcon, FileTextIcon, UserIcon } from "lucide-react";

import { type SearchMatch } from "@/stores/search";
import { SessionMatch } from "./session-match";
import { EventMatch } from "./event-match";
import { HumanMatch } from "./human-match";
import { OrganizationMatch } from "./organization-match";

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
