import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@hypr/ui/components/ui/carousel";

import { commands as dbCommands } from "@hypr/plugin-db";

export default function RecentNotes() {
  const navigate = useNavigate();

  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: () => dbCommands.listSessions({ recentlyVisited: [10] }),
  });

  const handleClickSession = (id: string) => {
    navigate({ to: "/app/note/$id", params: { id } });
  };

  return (
    <div className="mb-8 space-y-4">
      <h2 className="text-2xl font-medium">Recently Opened</h2>

      <Carousel className="-ml-2">
        <CarouselContent className="px-2">
          {sessions.data?.map((session: any, i) => (
            <CarouselItem
              key={i}
              className="basis-auto"
              onClick={() => handleClickSession(session.id)}
            >
              <div className="h-40 w-40 p-4 cursor-pointer transition-all border rounded-lg hover:bg-neutral-50 flex flex-col">
                <div className="font-medium text-base truncate">
                  {session.title}
                </div>
                <div className="mt-1 text-sm text-neutral-600 line-clamp-5">
                  {session.raw_memo_html}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-0 top-1/2 z-10 hover:bg-neutral-50" />
        <CarouselNext className="absolute right-0 top-1/2 z-10 hover:bg-neutral-50" />
      </Carousel>
    </div>
  );
}
