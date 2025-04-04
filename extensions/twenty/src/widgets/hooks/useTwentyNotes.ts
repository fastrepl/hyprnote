import { useOngoingSession } from "@hypr/utils/contexts";
import { useEffect, useRef, useState } from "react";
import * as twenty from "../../client";
import type { Person } from "../../client";

export const useTwentyNotes = () => {
  const [selectedPeople, setSelectedPeople] = useState<Array<Person>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const hasFetchedInitialResults = useRef(false);

  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const isMeetingActive = ongoingSessionStatus === "active";

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

  useEffect(() => {
    const fetchInitialPeople = async () => {
      if (!hasFetchedInitialResults.current && !isMeetingActive) {
        try {
          setIsLoading(true);
          const people = await twenty.findManyPeople();
          setSearchResults(people || []);
          hasFetchedInitialResults.current = true;
        } catch (error) {
          console.error("Failed to fetch initial people:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchInitialPeople();
  }, [isMeetingActive]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsLoading(true);

    try {
      if (!query.trim()) {
        const people = await twenty.findManyPeople();
        setSearchResults(people || []);
      } else {
        const people = await twenty.findManyPeople(query);
        setSearchResults(people || []);
      }
    } catch (error) {
      console.error("Failed to find people:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchFocus = async () => {
    setShowSearchResults(true);

    if (!hasFetchedInitialResults.current) {
      setIsLoading(true);
      try {
        const people = await twenty.findManyPeople();
        setSearchResults(people || []);
        hasFetchedInitialResults.current = true;
      } catch (error) {
        console.error("Failed to fetch all people:", error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSelectPerson = (person: Person) => {
    if (!selectedPeople.some(p => p.id === person.id)) {
      setSelectedPeople([...selectedPeople, person]);
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
      const noteTitle = "Meeting Notes";
      const note = await twenty.createOneNote(
        noteTitle,
        `Notes from meeting on ${new Date().toLocaleDateString()}`,
      );

      if (note && note.id) {
        await twenty.createManyNoteTargets(
          note.id,
          selectedPeople.map(person => person.id),
        );
      }

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
    isLoading,
    searchRef,
    isMeetingActive,
    handleSearch,
    handleSearchFocus,
    handleSelectPerson,
    handleRemovePerson,
    handleCreateNote,
    setShowSearchResults,
    setSearchQuery,
  };
};
