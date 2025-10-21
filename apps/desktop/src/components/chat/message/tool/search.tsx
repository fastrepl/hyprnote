import { SearchIcon } from "lucide-react";
import { useCallback } from "react";

import { Card, CardContent } from "@hypr/ui/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@hypr/ui/components/ui/carousel";
import * as persisted from "../../../../store/tinybase/persisted";
import { useTabs } from "../../../../store/zustand/tabs";
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

function RenderContent({ part }: { part: Part }) {
  if (part.state === "output-available" && part.output && "results" in part.output) {
    const { results } = part.output;

    if (!results || results.length === 0) {
      return (
        <div className="text-xs text-muted-foreground flex justify-center items-center py-2">
          No results found
        </div>
      );
    }

    return (
      <div className="relative -mx-1">
        <Carousel
          className="w-full"
          opts={{ align: "start" }}
        >
          <CarouselContent className="-ml-2">
            {results.map((result: any, index: number) => (
              <CarouselItem key={result.id || index} className="pl-1 basis-full sm:basis-1/2 lg:basis-1/3">
                <Card className="h-full bg-neutral-50">
                  <CardContent className="px-2 py-0.5">
                    <RenderSession sessionId={result.id} />
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-4 h-6 w-6 bg-neutral-100 hover:bg-neutral-200" />
          <CarouselNext className="-right-4 h-6 w-6 bg-neutral-100 hover:bg-neutral-200" />
        </Carousel>
      </div>
    );
  }

  if (part.state === "output-error") {
    return <div className="text-sm text-red-500">Error: {part.errorText}</div>;
  }

  return null;
}

function RenderSession({ sessionId }: { sessionId: string }) {
  const session = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);
  const { openNew } = useTabs();

  const handleClick = useCallback(() => {
    openNew({
      type: "sessions",
      id: sessionId,
      active: true,
      state: { editor: "raw" },
    });
  }, [openNew, sessionId]);

  if (!session) {
    return <div className="text-xs text-muted-foreground italic">Session unavailable</div>;
  }

  return (
    <div className="text-xs flex flex-col gap-1" onClick={handleClick}>
      <span className="font-medium truncate">
        {session.title || "Untitled"}
      </span>
      <span className="text-muted-foreground truncate">
        {session.enhanced_md ?? session.raw_md}
      </span>
    </div>
  );
}
