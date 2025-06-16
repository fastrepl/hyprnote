import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, SparklesIcon, TagsIcon } from "lucide-react";
import { useState } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

interface TagChipProps {
  sessionId: string;
}

export function TagChip({ sessionId }: TagChipProps) {
  const [open, setOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const queryClient = useQueryClient();

  const { data: tags = [] } = useQuery({
    queryKey: ["session-tags", sessionId],
    queryFn: () => dbCommands.listSessionTags(sessionId),
  });

  const { data: suggestions = [], isLoading: isLoadingSuggestions, refetch: fetchSuggestions } = useQuery({
    queryKey: ["tag-suggestions", sessionId],
    queryFn: () => dbCommands.suggestTagsForSession(sessionId),
    enabled: false, // Only fetch when requested
  });

  const removeMutation = useMutation({
    mutationFn: ({ tagId, sessionId }: { tagId: string; sessionId: string }) =>
      dbCommands.unassignTagFromSession(tagId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-tags", sessionId] });
    },
  });

  const acceptSuggestionMutation = useMutation({
    mutationFn: async (tagName: string) => {
      // Create the tag first
      const tag = await dbCommands.upsertTag({
        id: crypto.randomUUID(),
        name: tagName,
      });
      // Then assign it to the session
      await dbCommands.assignTagToSession(tag.id, sessionId);
      return tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-tags", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["tag-suggestions", sessionId] });
    },
  });

  const handleGetSuggestions = () => {
    setShowSuggestions(true);
    fetchSuggestions();
  };

  const totalTags = tags.length;
  const firstTag = tags[0]?.name;
  const additionalTags = totalTags - 1;

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 flex-shrink-0 text-xs">
            <TagsIcon size={14} className="flex-shrink-0" />
            {totalTags > 0
              ? (
                <span className="truncate">
                  {additionalTags > 0
                    ? `${firstTag} +${additionalTags}`
                    : firstTag}
                </span>
              )
              : <span className="text-neutral-500">Add tags</span>}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 overflow-clip p-0 py-2 shadow-lg"
          align="start"
        >
          <div className="space-y-1">
            {tags.length > 0
              ? (
                tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex w-full items-center justify-between gap-2 rounded-sm px-3 py-1.5 hover:bg-neutral-50"
                  >
                    <div className="rounded px-2 py-0.5 text-sm bg-neutral-100">{tag.name}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-neutral-500 hover:text-red-600"
                      onClick={() => removeMutation.mutate({ tagId: tag.id, sessionId })}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )
              : <div className="px-3 py-2 text-sm text-neutral-500">No tags assigned</div>}

            {/* AI Suggestions Section */}
            {showSuggestions && (
              <div className="border-t mx-2 pt-2">
                <div className="flex items-center gap-1 px-1 py-1 text-xs text-neutral-600">
                  <SparklesIcon size={12} />
                  <span>AI Suggestions</span>
                  {isLoadingSuggestions && <span className="text-neutral-400">...</span>}
                </div>
                <div className="space-y-1 mt-1">
                  {suggestions.length > 0
                    ? (
                      suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-2 px-2 py-1 hover:bg-neutral-50 rounded"
                        >
                          <span className="text-xs text-neutral-700">{suggestion}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1 text-xs text-blue-600 hover:text-blue-800"
                            onClick={() => acceptSuggestionMutation.mutate(suggestion)}
                            disabled={acceptSuggestionMutation.isPending}
                          >
                            Add
                          </Button>
                        </div>
                      ))
                    )
                    : !isLoadingSuggestions
                    ? <div className="px-2 py-1 text-xs text-neutral-400">No suggestions available</div>
                    : null}
                </div>
              </div>
            )}

            <div className="border-t mx-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-neutral-600 hover:text-neutral-900"
                onClick={() => {
                  if (!showSuggestions) {
                    handleGetSuggestions();
                  } else {
                    setShowSuggestions(false);
                  }
                }}
                disabled={isLoadingSuggestions}
              >
                <SparklesIcon size={12} className="mr-1" />
                {showSuggestions ? "Hide suggestions" : "Get AI suggestions"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-neutral-600 hover:text-neutral-900 mt-1"
                onClick={() => {
                  setOpen(false);
                  // TODO: Open tag management modal
                }}
              >
                <PlusIcon size={12} className="mr-1" />
                Manage tags
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
