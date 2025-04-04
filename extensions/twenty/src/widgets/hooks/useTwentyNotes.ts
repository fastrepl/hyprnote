import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { ops as twenty, type Person } from "../../client";

export const useTwentyNotes = (sessionId: string) => {
  const session = useSession(sessionId, (s) => s.session);
  const [selectedPeople, setSelectedPeople] = useState<Array<Person>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const isMeetingActive = ongoingSessionStatus === "active";

  const [shouldFetchData, setShouldFetchData] = useState(false);

  const { data: searchResults = [], isLoading } = useQuery<Person[], Error>({
    queryKey: ["people", searchQuery],
    queryFn: () =>
      searchQuery.trim()
        ? twenty.findManyPeople(searchQuery)
        : twenty.findManyPeople(),
    enabled: shouldFetchData || showSearchResults,
  });

  useEffect(() => {
    if (searchResults.length > 0 && !shouldFetchData) {
      setShouldFetchData(true);
    }
  }, [searchResults, shouldFetchData]);

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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSearchResults(true);
  };

  const handleSearchFocus = () => {
    setShowSearchResults(true);
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
