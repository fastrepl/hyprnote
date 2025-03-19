import { type SearchMatch } from "@/stores/search";

export function SearchList({ matches }: { matches: SearchMatch[] }) {
  return (
    <div>
      <p>Search results goes here</p>
      {matches.map((match, i) => (
        <div key={`${match.type}-${i}`}>
          {match.type === "session" && <RenderSessionMatch match={match} />}
          {match.type === "event" && <RenderEventMatch match={match} />}
          {match.type === "human" && <RenderHumanMatch match={match} />}
          {match.type === "organization" && <RenderOrganizationMatch match={match} />}
        </div>
      ))}
    </div>
  );
}

function RenderSessionMatch({ match }: { match: SearchMatch }) {
  return (
    <div className="border rounded-md p-2">
      <p>{JSON.stringify(match)}</p>
    </div>
  );
}

function RenderEventMatch({ match }: { match: SearchMatch }) {
  return (
    <div className="border rounded-md p-2">
      <p>{JSON.stringify(match)}</p>
    </div>
  );
}

function RenderHumanMatch({ match }: { match: SearchMatch }) {
  return (
    <div className="border rounded-md p-2">
      <p>{JSON.stringify(match)}</p>
    </div>
  );
}

function RenderOrganizationMatch({ match }: { match: SearchMatch }) {
  return (
    <div className="border rounded-md p-2">
      <p>{JSON.stringify(match)}</p>
    </div>
  );
}
