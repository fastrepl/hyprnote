import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { commands as dbCommands } from "@hypr/plugin-db";
import { FileText } from "lucide-react";

const extractTextFromHtml = (html: string | null | undefined): string => {
  if (!html) return "";

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const textContent = tempDiv.textContent || tempDiv.innerText || "";

  const sentences = textContent.split(/(?<=[.!?])\s+/);
  return sentences.slice(0, 3).join(" ").trim();
};

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
      <h2 className="text-2xl font-medium">Recently Opened</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {sessions.data?.map((session: any, i) => {
          const previewText = extractTextFromHtml(
            session.enhanced_memo_html || session.raw_memo_html,
          );

          return (
            <div
              key={i}
              onClick={() => handleClickSession(session.id)}
              className="h-40 w-40 shrink-0 p-4 cursor-pointer transition-all border rounded-lg hover:bg-neutral-50 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-neutral-500" />
                <div className="font-medium text-base truncate">
                  {session.title}
                </div>
              </div>
              <div className="text-sm text-neutral-600 line-clamp-3">
                {previewText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
