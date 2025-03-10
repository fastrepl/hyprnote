import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { commands as dbCommands } from "@hypr/plugin-db";
import { FileText } from "lucide-react";
import { extractTextFromHtml } from "@/utils";

export default function RecentNotes() {
  const navigate = useNavigate();

  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: () => dbCommands.listSessions({ recentlyVisited: [6] }),
  });

  const handleClickSession = (id: string) => {
    navigate({ to: "/app/note/$id", params: { id } });
  };

  return (
    <div className="mb-8 space-y-4 w-full">
      <h2 className="text-lg font-medium border-b pb-1 ">Recently Opened</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {sessions.data?.map((session: any, i) => {
          const previewText = extractTextFromHtml(
            session.enhanced_memo_html || session.raw_memo_html,
          );

          return (
            <div
              key={i}
              onClick={() => handleClickSession(session.id)}
              className="min-h-[8rem] p-4 cursor-pointer transition-all border rounded-lg hover:bg-neutral-50 hover:shadow-sm flex flex-col  "
            >
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-neutral-500 flex-shrink-0 " />
                <div className="font-medium text-base truncate ">
                  {session.title || "Untitled"}
                </div>
              </div>
              <div className="text-sm text-neutral-600 line-clamp-4 ">
                {previewText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
