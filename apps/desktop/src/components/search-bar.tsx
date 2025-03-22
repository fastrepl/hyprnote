import clsx from "clsx";
import {
  BuildingIcon,
  CalendarIcon,
  FileTextIcon,
  FolderIcon,
  HashIcon,
  SearchIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useHyprSearch } from "@/contexts/search";
import Shortcut from "./shortcut";

type MentionType = "date" | "people" | "orgs" | "notes" | "folders";
type TagType = "tag";

type MentionSuggestion = {
  id: string;
  type: MentionType;
  name: string;
};

type TagSuggestion = {
  id: string;
  type: TagType;
  name: string;
};

type Suggestion = MentionSuggestion | TagSuggestion;

const MENTION_SECTIONS = {
  date: "Dates",
  people: "People",
  orgs: "Organizations",
  notes: "Notes",
  folders: "Folders",
};

export function SearchBar() {
  const {
    searchQuery,
    searchInputRef,
    focusSearch,
    clearSearch,
    setSearchQuery,
  } = useHyprSearch((s) => ({
    searchQuery: s.query,
    searchInputRef: s.searchInputRef,
    focusSearch: s.focusSearch,
    clearSearch: s.clearSearch,
    setSearchQuery: s.setQuery,
  }));

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [mentionType, setMentionType] = useState<"@" | "#" | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const mockMentionSuggestions: MentionSuggestion[] = [
    { id: "1", type: "date", name: "Today" },
    { id: "2", type: "date", name: "Yesterday" },
    { id: "3", type: "date", name: "Last week" },
    { id: "4", type: "people", name: "John Doe" },
    { id: "5", type: "people", name: "Jane Smith" },
    { id: "6", type: "orgs", name: "Acme Corp" },
    { id: "7", type: "orgs", name: "Globex" },
    { id: "8", type: "notes", name: "Meeting notes" },
    { id: "9", type: "notes", name: "Project ideas" },
    { id: "10", type: "folders", name: "Work" },
    { id: "11", type: "folders", name: "Personal" },
  ];

  const mockTagSuggestions: TagSuggestion[] = [
    { id: "1", type: "tag", name: "important" },
    { id: "2", type: "tag", name: "todo" },
    { id: "3", type: "tag", name: "idea" },
    { id: "4", type: "tag", name: "meeting" },
    { id: "5", type: "tag", name: "project" },
  ];

  const groupedMentionSuggestions = (filteredSuggestions: MentionSuggestion[]) => {
    const grouped: Record<MentionType, MentionSuggestion[]> = {
      date: [],
      people: [],
      orgs: [],
      notes: [],
      folders: [],
    };

    filteredSuggestions.forEach(suggestion => {
      grouped[suggestion.type].push(suggestion);
    });

    return grouped;
  };

  const getFlatSuggestionsList = (suggestions: Suggestion[]) => {
    if (mentionType === "#") return suggestions;

    const mentionSuggestions = suggestions as MentionSuggestion[];
    const grouped = groupedMentionSuggestions(mentionSuggestions);

    const flatList: MentionSuggestion[] = [];
    Object.keys(grouped).forEach(key => {
      const type = key as MentionType;
      if (grouped[type].length > 0) {
        flatList.push(...grouped[type]);
      }
    });

    return flatList;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    const lastAtIndex = value.lastIndexOf("@");
    const lastHashIndex = value.lastIndexOf("#");

    if (lastAtIndex !== -1 && (lastHashIndex === -1 || lastAtIndex > lastHashIndex)) {
      const mentionTextValue = value.slice(lastAtIndex + 1);
      setMentionType("@");

      const filtered = mockMentionSuggestions.filter(
        suggestion => suggestion.name.toLowerCase().includes(mentionTextValue.toLowerCase()),
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setActiveSuggestionIndex(0);
    } else if (lastHashIndex !== -1 && (lastAtIndex === -1 || lastHashIndex > lastAtIndex)) {
      const tagTextValue = value.slice(lastHashIndex + 1);
      setMentionType("#");

      const filtered = mockTagSuggestions.filter(
        suggestion => suggestion.name.toLowerCase().includes(tagTextValue.toLowerCase()),
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setActiveSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
      setMentionType(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    const flatList = getFlatSuggestionsList(suggestions);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveSuggestionIndex(prev => prev < flatList.length - 1 ? prev + 1 : prev);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case "Enter":
        e.preventDefault();
        if (flatList.length > 0) {
          selectSuggestion(flatList[activeSuggestionIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    if (!searchInputRef?.current) return;

    const currentValue = searchInputRef.current.value;
    const prefix = mentionType === "@" ? "@" : "#";

    const lastPrefixIndex = currentValue.lastIndexOf(prefix);

    if (lastPrefixIndex !== -1) {
      const newValue = currentValue.substring(0, lastPrefixIndex)
        + prefix + suggestion.name + " ";

      setSearchQuery(newValue);
      setShowSuggestions(false);

      setTimeout(() => {
        if (searchInputRef?.current) {
          searchInputRef.current.focus();
          searchInputRef.current.selectionStart = newValue.length;
          searchInputRef.current.selectionEnd = newValue.length;
        }
      }, 0);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current
        && !suggestionsRef.current.contains(e.target as Node)
        && searchInputRef?.current
        && !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const renderSuggestionIcon = (suggestion: Suggestion) => {
    if ("type" in suggestion) {
      switch (suggestion.type) {
        case "date":
          return <CalendarIcon className="h-4 w-4 text-neutral-500" />;
        case "people":
          return <UserIcon className="h-4 w-4 text-neutral-500" />;
        case "orgs":
          return <BuildingIcon className="h-4 w-4 text-neutral-500" />;
        case "notes":
          return <FileTextIcon className="h-4 w-4 text-neutral-500" />;
        case "folders":
          return <FolderIcon className="h-4 w-4 text-neutral-500" />;
        case "tag":
          return <HashIcon className="h-4 w-4 text-neutral-500" />;
        default:
          return <SearchIcon className="h-4 w-4 text-neutral-500" />;
      }
    }

    return <SearchIcon className="h-4 w-4 text-neutral-500" />;
  };

  const renderSuggestionItem = (suggestion: Suggestion, index: number) => {
    const flatList = getFlatSuggestionsList(suggestions);
    const isActive = flatList.indexOf(suggestion) === activeSuggestionIndex;

    return (
      <div
        key={suggestion.id}
        className={clsx([
          "px-3 py-2 text-sm cursor-pointer hover:bg-neutral-100",
          isActive && "bg-neutral-100",
        ])}
        onClick={() => selectSuggestion(suggestion)}
      >
        <div className="flex items-center">
          <span className="mr-2">{renderSuggestionIcon(suggestion)}</span>
          <span>{suggestion.name}</span>
        </div>
      </div>
    );
  };

  const renderMentionSuggestions = () => {
    if (mentionType !== "@") return null;

    const mentionSuggestions = suggestions as MentionSuggestion[];
    const grouped = groupedMentionSuggestions(mentionSuggestions);

    return (
      <>
        {Object.keys(grouped).map((key) => {
          const type = key as MentionType;
          const items = grouped[type];

          if (items.length === 0) return null;

          return (
            <div key={type}>
              <div className="px-3 py-1 text-xs font-medium text-neutral-500 bg-neutral-50">
                {MENTION_SECTIONS[type]}
              </div>
              {items.map((suggestion, index) => renderSuggestionItem(suggestion, index))}
            </div>
          );
        })}
      </>
    );
  };

  const renderTagSuggestions = () => {
    if (mentionType !== "#") return null;

    return (
      <>
        <div className="px-3 py-1 text-xs font-medium text-neutral-500 bg-neutral-50">
          Tags
        </div>
        {suggestions.map((suggestion, index) => renderSuggestionItem(suggestion, index))}
      </>
    );
  };

  return (
    <div className="relative">
      <div
        className={clsx([
          "w-72 hidden sm:flex flex-row items-center gap-2 h-[34px]",
          "text-neutral-500 hover:text-neutral-600",
          "border border-border rounded-md px-2 py-2 bg-transparent hover:bg-white",
          "transition-colors duration-200",
        ])}
        onClick={() => focusSearch()}
      >
        <SearchIcon className="h-4 w-4 text-neutral-500" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search... (@ for mentions, # for tags)"
          className="flex-1 bg-transparent outline-none text-xs"
        />
        {searchQuery && (
          <XIcon
            onClick={() => clearSearch()}
            className="h-4 w-4 text-neutral-400 hover:text-neutral-600"
          />
        )}
        {!searchQuery && <Shortcut macDisplay="⌘K" windowsDisplay="Ctrl+K" />}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full bg-white border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {mentionType === "@" ? renderMentionSuggestions() : renderTagSuggestions()}
          {suggestions.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-500">
              No suggestions found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
