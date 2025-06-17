import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, SparklesIcon, TagsIcon } from "lucide-react";
import { useState } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

interface TagChipProps {
  sessionId: string;
  hashtags?: string[];
}

export function TagChip({ sessionId, hashtags = [] }: TagChipProps) {
  const { data: tags = [] } = useQuery({
    queryKey: ["session-tags", sessionId],
    queryFn: () => dbCommands.listSessionTags(sessionId),
  });

  // Combine database tags and content hashtags for display
  const allTags = [...tags.map(tag => tag.name), ...hashtags];
  const uniqueTags = [...new Set(allTags)]; // Remove duplicates

  const totalTags = uniqueTags.length;
  const firstTag = uniqueTags[0];
  const additionalTags = totalTags - 1;

  return (
    <Popover>
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

      <PopoverContent className="shadow-lg w-80" align="start">
        <TagChipInner sessionId={sessionId} hashtags={hashtags} />
      </PopoverContent>
    </Popover>
  );
}

function TagChipInner({ sessionId, hashtags = [] }: { sessionId: string; hashtags?: string[] }) {
  const queryClient = useQueryClient();
  const { data: tags = [] } = useQuery({
    queryKey: ["session-tags", sessionId],
    queryFn: () => dbCommands.listSessionTags(sessionId),
  });

  const addHashtagAsTagMutation = useMutation({
    mutationFn: async (tagName: string) => {
      // Check if tag already exists for this session
      const existingTags = await dbCommands.listSessionTags(sessionId);
      const tagExists = existingTags.some(
        tag => tag.name.toLowerCase() === tagName.toLowerCase(),
      );

      if (tagExists) {
        return null; // Skip if already exists
      }

      const tag = await dbCommands.upsertTag({
        id: crypto.randomUUID(),
        name: tagName,
      });
      await dbCommands.assignTagToSession(tag.id, sessionId);
      return tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-tags", sessionId] });
    },
  });

  // Filter out hashtags that are already database tags (case-insensitive)
  const existingTagNames = new Set(tags.map(tag => tag.name.toLowerCase()));
  const availableHashtags = hashtags.filter(hashtag => !existingTagNames.has(hashtag.toLowerCase()));

  const hasAnyTags = tags.length > 0 || hashtags.length > 0;

  return (
    !hasAnyTags
      ? <TagAddControl sessionId={sessionId} />
      : (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium text-neutral-700">Tags</div>
          <div className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
            {/* Database tags */}
            {tags.map((tag) => <TagItem key={tag.id} tag={tag} sessionId={sessionId} />)}

            {/* Content hashtags */}
            {availableHashtags.map((hashtag) => (
              <div
                key={hashtag}
                className="flex w-full items-center justify-between gap-2 rounded-sm px-3 py-1.5 hover:bg-neutral-50"
              >
                <button
                  className="rounded px-2 py-0.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                  onClick={() => addHashtagAsTagMutation.mutate(hashtag)}
                  title="Click to add as tag"
                  disabled={addHashtagAsTagMutation.isPending}
                >
                  #{hashtag}
                </button>
                <span className="text-xs text-neutral-400">Click to add</span>
              </div>
            ))}
          </div>
          <TagAddControl sessionId={sessionId} />
        </div>
      )
  );
}

function TagItem({ tag, sessionId }: { tag: { id: string; name: string }; sessionId: string }) {
  const queryClient = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: ({ tagId, sessionId }: { tagId: string; sessionId: string }) =>
      dbCommands.unassignTagFromSession(tagId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-tags", sessionId] });
    },
  });

  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-sm px-3 py-1.5 hover:bg-neutral-50">
      <button
        className="rounded px-2 py-0.5 text-sm bg-neutral-100 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
        onClick={() => removeMutation.mutate({ tagId: tag.id, sessionId })}
        title="Click to remove tag"
      >
        {tag.name}
      </button>
      <span className="text-xs text-neutral-400">Click to remove</span>
    </div>
  );
}

function TagAddControl({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const [newTagName, setNewTagName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: suggestions = [], isLoading: isLoadingSuggestions, refetch: fetchSuggestions } = useQuery({
    queryKey: ["tag-suggestions", sessionId],
    queryFn: () => dbCommands.suggestTagsForSession(sessionId),
    enabled: false,
  });

  const parseAndSanitizeTags = (input: string): string[] => {
    const tags = input
      .split(",")
      .map(tag => tag.trim())
      .map(tag => tag.replace(/[^\w\s\-\.]/g, ""))
      .map(tag => tag.replace(/\s+/g, " "))
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0 && tag.length <= 50);

    // Remove duplicates within the input (case-insensitive)
    const uniqueTags = [];
    const seenTags = new Set();

    for (const tag of tags) {
      const lowerTag = tag.toLowerCase();
      if (!seenTags.has(lowerTag)) {
        seenTags.add(lowerTag);
        uniqueTags.push(tag);
      }
    }

    return uniqueTags.slice(0, 10);
  };

  const createTagsMutation = useMutation({
    mutationFn: async (tagNames: string[]) => {
      // Get existing tags for this session to avoid duplicates
      const existingTags = await dbCommands.listSessionTags(sessionId);
      const existingTagNames = new Set(
        existingTags.map(tag => tag.name.toLowerCase()),
      );

      // Filter out duplicates (case-insensitive)
      const newTagNames = tagNames.filter(
        tagName => !existingTagNames.has(tagName.toLowerCase()),
      );

      const results = [];
      for (const tagName of newTagNames) {
        const tag = await dbCommands.upsertTag({
          id: crypto.randomUUID(),
          name: tagName,
        });
        await dbCommands.assignTagToSession(tag.id, sessionId);
        results.push(tag);
      }
      return results;
    },
    onSuccess: () => {
      setNewTagName("");
      queryClient.invalidateQueries({ queryKey: ["session-tags", sessionId] });
    },
  });

  const acceptSuggestionMutation = useMutation({
    mutationFn: async (tagName: string) => {
      // Check if tag already exists for this session
      const existingTags = await dbCommands.listSessionTags(sessionId);
      const tagExists = existingTags.some(
        tag => tag.name.toLowerCase() === tagName.toLowerCase(),
      );

      if (tagExists) {
        return null; // Skip if already exists
      }

      const tag = await dbCommands.upsertTag({
        id: crypto.randomUUID(),
        name: tagName,
      });
      await dbCommands.assignTagToSession(tag.id, sessionId);
      return tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-tags", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["tag-suggestions", sessionId] });
    },
  });

  const handleCreateTags = () => {
    const tagNames = parseAndSanitizeTags(newTagName);
    if (tagNames.length > 0) {
      createTagsMutation.mutate(tagNames);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateTags();
    }
  };

  const handleGetSuggestions = () => {
    setShowSuggestions(true);
    fetchSuggestions();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded bg-neutral-50 border border-neutral-200">
        <span className="text-neutral-500 flex-shrink-0">
          <TagsIcon className="size-4" />
        </span>
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag..."
          className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
          autoFocus
        />
        {newTagName.trim() && (
          <button
            type="button"
            onClick={handleCreateTags}
            className="text-neutral-500 hover:text-neutral-700 transition-colors flex-shrink-0"
            aria-label="Add tag"
            disabled={createTagsMutation.isPending}
          >
            <PlusIcon className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
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

        {showSuggestions && (
          <div className="space-y-1">
            {isLoadingSuggestions
              ? <div className="text-sm text-neutral-500 p-3 text-center">Loading suggestions...</div>
              : suggestions.length > 0
              ? (
                suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 p-2 hover:bg-neutral-50 rounded border"
                  >
                    <span className="text-sm">{suggestion}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800"
                      onClick={() => acceptSuggestionMutation.mutate(suggestion)}
                      disabled={acceptSuggestionMutation.isPending}
                    >
                      Add
                    </Button>
                  </div>
                ))
              )
              : <div className="text-sm text-neutral-500 p-3 text-center">No suggestions available</div>}
          </div>
        )}
      </div>
    </div>
  );
}
