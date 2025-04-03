import { User, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { WidgetHeader, type WidgetTwoByTwo, WidgetTwoByTwoWrapper } from "@hypr/ui/components/ui/widgets";
import { useOngoingSession, useSessions } from "@hypr/utils/contexts";

import * as twenty from "../../client";

const Twenty2x2: WidgetTwoByTwo = () => {
  const sessionId = useSessions((s) => s.currentSessionId);

  return (
    <WidgetTwoByTwoWrapper>
      <div className="p-4 pb-0">
        <WidgetHeader
          title={
            <div className="flex items-center gap-2">
              <img
                src="../assets/twenty-icon.jpg"
                className="size-5 rounded-md"
              />
              Create note
            </div>
          }
          actions={[]}
        />
      </div>
      {sessionId && <Inner />}
    </WidgetTwoByTwoWrapper>
  );
};

function Inner() {
  const [selectedPeople, setSelectedPeople] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Check if meeting is ongoing
  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const isMeetingActive = ongoingSessionStatus === "active";

  // Handle clicks outside of search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Search for people in Twenty
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const people = await twenty.findManyPeople(query);
      setSearchResults(people || []);
    } catch (error) {
      console.error("Failed to find people:", error);
      setSearchResults([]);
    }
  };

  const handleSelectPerson = (person: any) => {
    // Check if person is already selected
    if (!selectedPeople.some(p => p.id === person.id)) {
      setSelectedPeople([...selectedPeople, {
        id: person.id,
        name: `${person.name.firstName} ${person.name.lastName}`,
        email: person.emails.primaryEmail,
      }]);
    }
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleRemovePerson = (id: string) => {
    setSelectedPeople(selectedPeople.filter(person => person.id !== id));
  };

  const handleCreateNote = async () => {
    if (selectedPeople.length === 0) {
      return;
    }

    setIsCreatingNote(true);
    try {
      // Create a note with a default title
      const noteTitle = "Meeting Notes";
      const note = await twenty.createOneNote(
        noteTitle,
        `Notes from meeting on ${new Date().toLocaleDateString()}`,
      );

      // Link the note to the selected people
      if (note && note.id) {
        await twenty.createManyNoteTargets(
          note.id,
          selectedPeople.map(person => person.id),
        );
      }

      // Reset selection after successful creation
      setSelectedPeople([]);
    } catch (error) {
      console.error("Failed to create note:", error);
    } finally {
      setIsCreatingNote(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Search input with dropdown results */}
      <div className="w-full mb-4" ref={searchRef}>
        <div className="flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              handleSearch(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search by name or email"
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400 border border-input rounded-md px-3 py-2 h-9 focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={isMeetingActive}
          />
        </div>

        {showSearchResults && searchQuery.trim() && (
          <div className="relative">
            <div className="absolute z-10 w-full mt-1 bg-white rounded-md border border-border overflow-hidden">
              {searchResults.length > 0
                ? (
                  <div className="max-h-60 overflow-auto">
                    {searchResults.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
                        onClick={() => handleSelectPerson(person)}
                      >
                        <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-blue-100 text-blue-600 rounded-full">
                          <User className="size-3" />
                        </span>
                        <div className="flex flex-col">
                          <span className="font-medium text-neutral-900 truncate">
                            {person.name.firstName} {person.name.lastName}
                          </span>
                          <span className="text-xs text-neutral-500 truncate">
                            {person.emails.primaryEmail}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )
                : (
                  <div className="px-3 py-2 text-sm text-neutral-500">
                    No results found
                  </div>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Participants list */}
      <div className="flex-grow overflow-auto mb-4 border border-border rounded-md">
        {selectedPeople.length > 0
          ? (
            <ul className="divide-y divide-border">
              {selectedPeople.map((person) => (
                <li key={person.id} className="flex items-center justify-between p-2 hover:bg-neutral-50">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 size-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full">
                      <User className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{person.name}</p>
                      <p className="text-xs text-neutral-500">{person.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleRemovePerson(person.id)}
                    className="text-neutral-500 hover:text-neutral-700 p-1"
                    disabled={isMeetingActive}
                  >
                    <XIcon size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )
          : (
            <div className="flex items-center justify-center h-full text-sm text-neutral-500 p-4">
              No participants selected
            </div>
          )}
      </div>

      {/* Create note button */}
      <Button
        onClick={handleCreateNote}
        disabled={selectedPeople.length === 0 || isCreatingNote || isMeetingActive}
        className="w-full"
      >
        {isCreatingNote
          ? "Creating..."
          : isMeetingActive
          ? "You can create a note after meeting is over"
          : "Create Note in Twenty"}
      </Button>
    </div>
  );
}

export default Twenty2x2;
