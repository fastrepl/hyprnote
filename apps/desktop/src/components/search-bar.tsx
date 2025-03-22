import clsx from "clsx";
import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useHyprSearch } from "@/contexts/search";
import Shortcut from "./shortcut";

// Define types for mention suggestions
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

  // Mock data for suggestions - in a real app, this would come from your database
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

  // Handle input changes and detect mention operators
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Check for mention operators
    const lastAtIndex = value.lastIndexOf('@');
    const lastHashIndex = value.lastIndexOf('#');
    
    if (lastAtIndex !== -1 && (lastHashIndex === -1 || lastAtIndex > lastHashIndex)) {
      // @ operator found
      const mentionTextValue = value.slice(lastAtIndex + 1);
      setMentionType('@');
      
      // Filter suggestions based on mention text
      const filtered = mockMentionSuggestions.filter(
        suggestion => suggestion.name.toLowerCase().includes(mentionTextValue.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setActiveSuggestionIndex(0);
    } else if (lastHashIndex !== -1 && (lastAtIndex === -1 || lastHashIndex > lastAtIndex)) {
      // # operator found
      const tagTextValue = value.slice(lastHashIndex + 1);
      setMentionType('#');
      
      // Filter suggestions based on tag text
      const filtered = mockTagSuggestions.filter(
        suggestion => suggestion.name.toLowerCase().includes(tagTextValue.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setActiveSuggestionIndex(0);
    } else {
      // No operators or text after operator is empty
      setShowSuggestions(false);
      setMentionType(null);
    }
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : 0
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions.length > 0) {
          selectSuggestion(suggestions[activeSuggestionIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion: Suggestion) => {
    if (!searchInputRef?.current) return;
    
    const currentValue = searchInputRef.current.value;
    const prefix = mentionType === '@' ? '@' : '#';
    
    // Find the last occurrence of the prefix
    const lastPrefixIndex = currentValue.lastIndexOf(prefix);
    
    if (lastPrefixIndex !== -1) {
      // Replace the text after the prefix with the selected suggestion
      const newValue = 
        currentValue.substring(0, lastPrefixIndex) + 
        prefix + suggestion.name + ' ';
      
      setSearchQuery(newValue);
      setShowSuggestions(false);
      
      // Focus and set cursor position at the end
      setTimeout(() => {
        if (searchInputRef?.current) {
          searchInputRef.current.focus();
          searchInputRef.current.selectionStart = newValue.length;
          searchInputRef.current.selectionEnd = newValue.length;
        }
      }, 0);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(e.target as Node) &&
        searchInputRef?.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Render suggestion item with icon based on type
  const renderSuggestionItem = (suggestion: Suggestion) => {
    let icon = '🔍';
    
    if ('type' in suggestion) {
      switch (suggestion.type) {
        case 'date':
          icon = '📅';
          break;
        case 'people':
          icon = '👤';
          break;
        case 'orgs':
          icon = '🏢';
          break;
        case 'notes':
          icon = '📝';
          break;
        case 'folders':
          icon = '📁';
          break;
        case 'tag':
          icon = '#️⃣';
          break;
        default:
          break;
      }
    }
    
    return (
      <div className="flex items-center">
        <span className="mr-2">{icon}</span>
        <span>{suggestion.name}</span>
        <span className="ml-2 text-xs text-neutral-400">
          {('type' in suggestion && suggestion.type !== 'tag') ? suggestion.type : ''}
        </span>
      </div>
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
          <div className="p-2 text-xs font-medium text-neutral-500 border-b border-border">
            {mentionType === '@' ? 'Mention suggestions' : 'Tag suggestions'}
          </div>
          <div>
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                className={clsx([
                  "px-3 py-2 text-sm cursor-pointer hover:bg-neutral-100",
                  index === activeSuggestionIndex && "bg-neutral-100"
                ])}
                onClick={() => selectSuggestion(suggestion)}
              >
                {renderSuggestionItem(suggestion)}
              </div>
            ))}
            {suggestions.length === 0 && (
              <div className="px-3 py-2 text-sm text-neutral-500">
                No suggestions found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
