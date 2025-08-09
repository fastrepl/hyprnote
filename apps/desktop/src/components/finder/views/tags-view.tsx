import { useQuery } from "@tanstack/react-query";
import type { LinkProps } from "@tanstack/react-router";
import { format, isToday } from "date-fns";
import { Archive, FileText, Hash, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Input } from "@hypr/ui/components/ui/input";
import { cn } from "@hypr/ui/lib/utils";

interface TagsViewProps {
  userId: string;
}

export function TagsView({ userId }: TagsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Load all tags
  const { data: allTags = [] } = useQuery({
    queryKey: ["all-tags"],
    queryFn: () => dbCommands.listAllTags(),
  });

  // Get sessions for selected tag
  const { data: filteredSessions = [] } = useQuery({
    queryKey: ["sessions-by-tag", selectedTag, userId],
    queryFn: async () => {
      if (!selectedTag) {
        return [];
      }

      return dbCommands.listSessions({
        type: "tagFilter",
        tag_ids: [selectedTag],
        user_id: userId,
        limit: 100,
      });
    },
    enabled: !!selectedTag,
  });

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    if (!searchTerm) {
      return allTags;
    }

    return allTags.filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allTags, searchTerm]);

  // Handle tag selection
  const selectTag = (tagId: string) => {
    setSelectedTag(tagId === selectedTag ? null : tagId);
  };

  // Handle session click
  const handleSessionClick = (sessionId: string) => {
    const url = { to: "/app/note/$id", params: { id: sessionId } } as const satisfies LinkProps;
    windowsCommands.windowShow({ type: "main" }).then(() => {
      windowsCommands.windowEmitNavigate({ type: "main" }, {
        path: url.to.replace("$id", sessionId),
        search: null,
      });
    });
  };

  // Format date for display
  const formatDisplayDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return "Today, " + format(date, "h:mm a");
    }
    return format(date, "MMM d, yyyy");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-neutral-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search tags..."
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tag cloud */}
      <div className="px-4 py-4 border-b border-neutral-100 max-h-[35%] overflow-y-auto">
        {filteredTags.length > 0
          ? (
            <div className="flex flex-wrap gap-2">
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => selectTag(tag.id)}
                  className={cn(
                    "rounded-full transition-all text-sm px-2.5 py-1.5",
                    "border",
                    selectedTag === tag.id
                      ? "bg-blue-50 text-black border-blue-500 hover:bg-blue-50"
                      : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300",
                  )}
                >
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3 opacity-60" />
                    {tag.name}
                  </span>
                </button>
              ))}
            </div>
          )
          : (
            <div className="text-center py-8 text-neutral-500">
              {searchTerm ? "No tags found matching your search" : "No tags available"}
            </div>
          )}
      </div>

      {/* Sessions grid */}
      <div className="flex-1 overflow-y-auto">
        {!selectedTag
          ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400">
              <Hash className="h-12 w-12 mb-3 text-neutral-300" />
              <p className="text-neutral-500 font-medium">Select tags to view notes</p>
              <p className="text-sm text-neutral-400 mt-1">
                Click on tags above to filter your notes
              </p>
            </div>
          )
          : filteredSessions.length > 0
          ? (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSessionClick(session.id)}
                  className="text-left p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all bg-white"
                >
                  <div className="flex items-start justify-between mb-2">
                    <FileText className="h-4 w-4 text-neutral-400 mt-0.5" />
                    <span className="text-xs text-neutral-500">
                      {formatDisplayDate(session.created_at)}
                    </span>
                  </div>
                  <h3 className="font-medium text-sm mb-1 line-clamp-1">
                    {session.title || "Untitled Note"}
                  </h3>
                  {session.raw_memo_html && (
                    <p className="text-xs text-neutral-500 line-clamp-2">
                      {session.raw_memo_html.replace(/<[^>]*>/g, "").substring(0, 100)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )
          : (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400">
              <Archive className="h-12 w-12 mb-3 text-neutral-300" />
              <p className="text-neutral-500 font-medium">No notes found</p>
              <p className="text-sm text-neutral-400 mt-1">
                No notes are tagged with the selected tags
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
