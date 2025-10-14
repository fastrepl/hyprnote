import { SearchIcon } from "lucide-react";

import { Disclosure } from "../shared";
import { ToolRenderer } from "../types";

type Renderer = ToolRenderer<"tool-search_sessions">;
type Part = Parameters<Renderer>[0]["part"];

export const ToolSearchSessions: Renderer = ({ part }) => {
  const disabled = part.state === "input-streaming" || part.state === "input-available";

  return (
    <Disclosure
      icon={<SearchIcon className="w-3 h-3" />}
      title={getTitle(part)}
      disabled={disabled}
    >
      <RenderContent part={part} />
    </Disclosure>
  );
};

const getTitle = (part: Part) => {
  if (part.state === "input-streaming") {
    return "Preparing search...";
  }
  if (part.state === "input-available") {
    return `Searching for: ${part.input.query}`;
  }
  if (part.state === "output-available") {
    return `Searched for: ${part.input.query}`;
  }
  if (part.state === "output-error") {
    return part.input ? `Search failed: ${part.input.query}` : "Search failed";
  }
  return "Search";
};

const RenderContent = ({ part }: { part: Part }) => {
  if (part.state === "output-available" && part.output && "results" in part.output) {
    const { results } = part.output;

    return (
      <pre className="text-xs overflow-auto">
            {JSON.stringify(results, null, 2)}
      </pre>
    );
  }

  if (part.state === "output-error") {
    return <div className="text-sm text-red-500">Error: {part.errorText}</div>;
  }

  return null;
};
