import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { PlusIcon, SearchIcon, SparklesIcon, TagsIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { generateTagsForSession } from "@/utils/tag-generation";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { useSession } from "@hypr/utils/contexts";

interface TagChipProps {
  sessionId: string;
  hashtags?: string[];
  isVeryNarrow?: boolean;
  isNarrow?: boolean;
}

export function TagChip({ sessionId, hashtags = [], isVeryNarrow = false, isNarrow = false }: TagChipProps) {
  const { data: tags = [] } = useQuery({
    queryKey: ["session-tags", sessionId],
    queryFn: () => dbCommands.listSessionTags(sessionId),
  });

  // Combine database tags and content hashtags for display
  const allTags = [...tags.map(tag => tag.name), ...hashtags];
  const uniqueTags = [...new Set(allTags)]; // Remove duplicates

  // Check if there are pending hashtags that could be added as tags
  const existingTagNames = new Set(tags.map(tag => tag.name.toLowerCase()));
  const availableHashtags = hashtags.filter(hashtag => !existingTagNames.has(hashtag.toLowerCase()));
  const hasPendingActions = availableHashtags.length > 0;

  const totalTags = uniqueTags.length;
  const firstTag = uniqueTags[0];
  const additionalTags = totalTags - 1;

  const getTagText = () => {
    if (totalTags === 0) {
      return isVeryNarrow ? "Tags" : isNarrow ? "Tags" : "Add tags";
    }

    // show just the number when narrow (matching participants-chip)
    if (isVeryNarrow || isNarrow) {
      return totalTags.toString();
    }

    return additionalTags > 0 ? `${firstTag} +${additionalTags}` : firstTag;
  };

  return (
    <Popover>
      <PopoverTrigger>
        <div
          className={`relative flex flex-row items-center gap-2 rounded-md hover:bg-neutral-100 flex-shrink-0 text-xs transition-all duration-300 ${
            isVeryNarrow ? "px-1.5 py-1" : "px-2 py-1.5"
          } ${hasPendingActions ? "bg-gradient-to-r from-blue-50 to-purple-50 animate-pulse shadow-sm" : ""}`}
        >
          <TagsIcon size={14} className="flex-shrink-0" />
          {hasPendingActions && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          )}
          {!isVeryNarrow && (
            <span className={`truncate ${totalTags === 0 ? "text-neutral-500" : ""}`}>
              {getTagText()}
            </span>
          )}
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

  const { data: allTags = [] } = useQuery({
    queryKey: ["all-tags"],
    queryFn: () => dbCommands.listAllTags(),
  });

  const addHashtagAsTagMutation = useMutation({
    mutationFn: async (tagName: string) => {
      // Check if tag already exists for this session using cached data
      const tagExists = tags.some(
        tag => tag.name.toLowerCase() === tagName.toLowerCase(),
      );

      if (tagExists) {
        return null; // Skip if already exists
      }

      // Check if tag already exists globally
      const existingGlobalTag = allTags.find(
        tag => tag.name.toLowerCase() === tagName.toLowerCase(),
      );

      const tag = await dbCommands.upsertTag({
        id: existingGlobalTag?.id || crypto.randomUUID(),
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
      ? <TagAddControl sessionId={sessionId} allTags={allTags} />
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
                  className="rounded px-2 py-0.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1"
                  onClick={() => addHashtagAsTagMutation.mutate(hashtag)}
                  title="From your notes - click to add as tag"
                  disabled={addHashtagAsTagMutation.isPending}
                >
                  #{hashtag}
                </button>
                <span className="text-xs text-neutral-400">From notes</span>
              </div>
            ))}
          </div>
          <TagAddControl sessionId={sessionId} allTags={allTags} />
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

function TagAddControl({ sessionId, allTags }: { sessionId: string; allTags: { id: string; name: string }[] }) {
  const queryClient = useQueryClient();
  const [newTagName, setNewTagName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const instanceId = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const sessionContent = useSession(sessionId, (s) => s.session.raw_memo_html);

  const { data: transcriptWords = [] } = useQuery({
    queryKey: ["session", "words", sessionId],
    queryFn: () => dbCommands.getWords(sessionId),
    enabled: !!sessionId,
  });

  // Check if content is too short and no transcript
  const contentLength = sessionContent?.replace(/<[^>]*>/g, "").trim().length || 0; // Strip HTML tags
  const hasTranscript = transcriptWords.length > 0;
  const isContentTooShort = contentLength < 50;
  const shouldBlockSuggestions = isContentTooShort && !hasTranscript;

  // Reset suggestions state when sessionId changes
  useEffect(() => {
    setShowSuggestions(false);
  }, [sessionId]);

  const { data: suggestions = [], isLoading: isLoadingSuggestions, refetch: fetchSuggestions } = useQuery({
    queryKey: ["tag-suggestions", sessionId, instanceId],
    queryFn: () => generateTagsForSession(sessionId),
    enabled: false,
  });

  // Get existing tags for this session to filter out duplicates
  const { data: sessionTags = [] } = useQuery({
    queryKey: ["session-tags", sessionId],
    queryFn: () => dbCommands.listSessionTags(sessionId),
  });

  // Filter existing tags based on input and exclude already assigned tags
  const existingSessionTagNames = new Set(sessionTags.map(tag => tag.name.toLowerCase()));
  const filteredExistingTags = allTags.filter(tag =>
    !existingSessionTagNames.has(tag.name.toLowerCase())
    && tag.name.toLowerCase().includes(newTagName.toLowerCase().trim())
    && newTagName.trim().length > 0
  ).slice(0, 5); // Limit to 5 suggestions

  // Check if input exactly matches an existing tag
  const exactMatch = allTags.find(tag => tag.name.toLowerCase() === newTagName.toLowerCase().trim());
  const shouldShowCreateOption = newTagName.trim().length > 0 && !exactMatch
    && !existingSessionTagNames.has(newTagName.toLowerCase().trim());

  // Get AI suggestions that aren't already assigned
  const filteredAISuggestions = suggestions.filter(suggestion =>
    !existingSessionTagNames.has(suggestion.toLowerCase())
  );

  const { data: recentTags = [] } = useQuery({
    queryKey: ["recent-tags"],
    queryFn: async () => {
      const allTagsWithSessions = await dbCommands.listAllTags();
      // Sort by name for now (you could add creation date to sort properly)
      return allTagsWithSessions.slice(0, 10); // Get more than 5 to filter later
    },
  });

  // Get recent tags that aren't already assigned to this session
  const filteredRecentTags = recentTags
    .filter(tag => !existingSessionTagNames.has(tag.name.toLowerCase()))
    .slice(0, 5); // Limit to 5

  const parseAndSanitizeTags = (input: string): string[] => {
    const tags = input
      .split(",")
      .map(tag => tag.trim())
      .map(tag => tag.replace(/[^\w\s\-\.]/g, ""))
      .map(tag => tag.replace(/\s+/g, " "))
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0 && tag.length <= 50);

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
      // Use cached session tags to avoid duplicates
      const existingTagNames = new Set(
        sessionTags.map(tag => tag.name.toLowerCase()),
      );

      // Filter out duplicates (case-insensitive)
      const newTagNames = tagNames.filter(
        tagName => !existingTagNames.has(tagName.toLowerCase()),
      );

      // Query database for existing tags matching the input names
      const allExistingTags = await dbCommands.listAllTags();
      const existingTagsMap = new Map(
        allExistingTags.map(tag => [tag.name.toLowerCase(), tag]),
      );

      const results = [];
      for (const tagName of newTagNames) {
        // Check if tag already exists in database
        const existingTag = existingTagsMap.get(tagName.toLowerCase());

        const tag = await dbCommands.upsertTag({
          id: existingTag?.id || crypto.randomUUID(),
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
      // Check if tag already exists for this session using cached data
      const tagExists = sessionTags.some(
        tag => tag.name.toLowerCase() === tagName.toLowerCase(),
      );

      if (tagExists) {
        return null; // Skip if already exists
      }

      // Check if tag already exists globally
      const existingGlobalTag = allTags.find(
        tag => tag.name.toLowerCase() === tagName.toLowerCase(),
      );

      const tag = await dbCommands.upsertTag({
        id: existingGlobalTag?.id || crypto.randomUUID(),
        name: tagName,
      });
      await dbCommands.assignTagToSession(tag.id, sessionId);
      return tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-tags", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["tag-suggestions", sessionId, instanceId] });
    },
  });

  const handleCreateTags = () => {
    const tagNames = parseAndSanitizeTags(newTagName);
    if (tagNames.length > 0) {
      createTagsMutation.mutate(tagNames);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Don't handle Enter here if we have a selection - let the global handler handle it
    if (e.key === "Enter" && selectedIndex === -1) {
      e.preventDefault();
      handleCreateTags();
    }
    // Don't prevent default for arrow keys - let the global handler handle them
  };

  const handleGetSuggestions = () => {
    if (!showSuggestions) {
      setShowSuggestions(true);
      fetchSuggestions();
    } else {
      setShowSuggestions(false);
    }
  };

  const handleTagSelect = async (tagName: string) => {
    const tagNames = [tagName];
    await createTagsMutation.mutateAsync(tagNames);
    setNewTagName("");
    setShowDropdown(false);
    setSelectedIndex(-1);
    // Refocus input after mutation
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInputChange = (value: string) => {
    setNewTagName(value);
    setShowDropdown(value.trim().length > 0);
  };

  const handleInputFocus = () => {
    if (newTagName.trim().length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding dropdown to allow clicks on dropdown items
    setTimeout(() => {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }, 200);
  };

  // Calculate total dropdown items for navigation
  const totalDropdownItems = filteredExistingTags.length + (shouldShowCreateOption ? 1 : 0);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showDropdown || totalDropdownItems === 0) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(selectedIndex < totalDropdownItems - 1 ? selectedIndex + 1 : 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : totalDropdownItems - 1);
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        if (selectedIndex < filteredExistingTags.length) {
          // Select existing tag
          const tag = filteredExistingTags[selectedIndex];
          handleTagSelect(tag.name);
        } else {
          // Create new tag
          handleTagSelect(newTagName.trim());
        }
      } else if (e.key === "Escape") {
        setSelectedIndex(-1);
        setShowDropdown(false);
        inputRef.current?.focus();
      }
    };

    // Only add listener when input is focused and dropdown is shown
    if (inputRef.current === document.activeElement && showDropdown && totalDropdownItems > 0) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedIndex, totalDropdownItems, filteredExistingTags, showDropdown, newTagName]);

  // Reset selection when dropdown content changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [newTagName, showDropdown]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded bg-neutral-50 border border-neutral-200">
          <span className="text-neutral-500 flex-shrink-0">
            <SearchIcon className="size-4" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={newTagName}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Search or add tags..."
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
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

        {/* Autocomplete Dropdown */}
        {showDropdown && (filteredExistingTags.length > 0 || shouldShowCreateOption) && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {/* Existing tags that match */}
            {filteredExistingTags.map((tag, index) => (
              <button
                key={tag.id}
                className={clsx(
                  "w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 border-b border-neutral-100 last:border-b-0 flex items-center gap-2 transition-colors",
                  selectedIndex === index && "bg-neutral-100",
                )}
                onClick={() => handleTagSelect(tag.name)}
              >
                <TagsIcon className="size-3 text-neutral-400" />
                <span>{tag.name}</span>
              </button>
            ))}

            {/* Create new tag option */}
            {shouldShowCreateOption && (
              <button
                className={clsx(
                  "w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 text-blue-700 flex items-center gap-2 font-medium transition-colors",
                  selectedIndex === filteredExistingTags.length && "bg-neutral-100",
                )}
                onClick={() => handleTagSelect(newTagName.trim())}
              >
                <PlusIcon className="size-3" />
                <span>Create "{newTagName.trim()}"</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recent Tags Section */}
      {filteredRecentTags.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-neutral-600">Recent Tags</div>
          <div className="flex flex-wrap gap-1">
            {filteredRecentTags.map((tag) => (
              <button
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 rounded-md border border-neutral-200 transition-colors"
                onClick={() => handleTagSelect(tag.name)}
                disabled={createTagsMutation.isPending}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Existing AI suggestions section */}
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs text-neutral-600 hover:text-neutral-900 disabled:text-neutral-400"
          onClick={handleGetSuggestions}
          disabled={isLoadingSuggestions || shouldBlockSuggestions}
          title={shouldBlockSuggestions ? "Add more content or record audio to get AI suggestions" : undefined}
        >
          <SparklesIcon size={12} className="mr-1" />
          {shouldBlockSuggestions
            ? "Need more content for AI suggestions"
            : showSuggestions
            ? "Hide AI suggestions"
            : "Get AI suggestions"}
        </Button>

        {shouldBlockSuggestions && (
          <div className="text-xs text-neutral-500 p-2 text-center bg-neutral-50 rounded border">
            Add more content ({contentLength}/50 characters) or record audio to get AI tag suggestions
          </div>
        )}

        {showSuggestions && (
          <div className="space-y-1">
            {isLoadingSuggestions
              ? <div className="text-sm text-neutral-500 p-3 text-center">Loading suggestions...</div>
              : filteredAISuggestions.length > 0
              ? (
                <TooltipProvider>
                  <div className="grid grid-cols-1 gap-1">
                    {filteredAISuggestions.map((suggestion, index) => (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          <button
                            className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded border-2 border-dashed border-blue-200 bg-blue-50/30 transition-all duration-200 hover:border-blue-300 hover:shadow-sm group"
                            onClick={() => acceptSuggestionMutation.mutate(suggestion)}
                            disabled={acceptSuggestionMutation.isPending}
                          >
                            <SparklesIcon className="size-3 text-blue-500 group-hover:text-blue-600" />
                            <span className="text-sm text-blue-700 group-hover:text-blue-800 font-medium">
                              {suggestion}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p>Suggested by Hyprnote</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              )
              : <div className="text-sm text-neutral-500 p-3 text-center">No AI suggestions available</div>}
          </div>
        )}
      </div>
    </div>
  );
}
