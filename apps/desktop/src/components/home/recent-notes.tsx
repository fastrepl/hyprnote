import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { CarouselItem } from "@hypr/ui/components/ui/carousel";
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

      <div className="overflow-x-auto -mx-8 px-8">
        <div className="flex gap-4">
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
        </div>
      </div>
    </div>
  );
}
