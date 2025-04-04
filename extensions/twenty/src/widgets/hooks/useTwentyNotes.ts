import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import * as twenty from "../../client";
import type { Person } from "../../client";

export const useTwentyNotes = (sessionId: string) => {
  const session = useSession(sessionId, (s) => s.session);

  const [selectedPeople, setSelectedPeople] = useState<Array<Person>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<any>>([]);

  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const hasFetchedInitialResults = useRef(false);

  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const isMeetingActive = ongoingSessionStatus === "active";

  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const note = await twenty.createOneNote(
        session.title,
        `${session.enhanced_memo_html}\n\nNotes from meeting on ${new Date().toLocaleDateString()}`,
      );

      await twenty.createManyNoteTargets(
        note.id,
        selectedPeople.map(person => person.id),
      );
    },
    onError: console.error,
    onSuccess: () => {
      setSelectedPeople([]);
    },
  });

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

  return {
    selectedPeople,
    searchQuery,
    showSearchResults,
    searchResults,
    isLoading,
    searchRef,
    isMeetingActive,
    isCreatingNote: createNoteMutation.isPending,
    handleSearch,
    handleSearchFocus,
    handleSelectPerson,
    handleRemovePerson,
    handleCreateNote: () => createNoteMutation.mutate({}),
    setShowSearchResults,
    setSearchQuery,
  };
};
