import { useState, useEffect, useRef } from "react";
import { useOngoingSession } from "@hypr/utils/contexts";
import * as twenty from "../../client";

export interface Person {
  id: string;
  name: string;
  email: string;
}

export const useTwentyNotes = () => {
  const [selectedPeople, setSelectedPeople] = useState<Array<Person>>([]);
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

  return {
    selectedPeople,
    searchQuery,
    showSearchResults,
    searchResults,
    isCreatingNote,
    searchRef,
    isMeetingActive,
    handleSearch,
    handleSelectPerson,
    handleRemovePerson,
    handleCreateNote,
    setShowSearchResults,
    setSearchQuery,
  };
};
