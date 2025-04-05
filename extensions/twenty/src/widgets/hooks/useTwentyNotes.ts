import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { ops as twenty, type Person } from "../../client";

export const useTwentyNotes = (sessionId: string) => {
  const searchRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<Array<Person>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const isMeetingActive = ongoingSessionStatus === "active";

  const enhancedNote = useSession(
    sessionId,
    (s) => s.session.enhanced_memo_html,
  );
  const isEnhanced = Boolean(enhancedNote);

  const { data: searchResults = [], isLoading } = useQuery<Person[], Error>({
    queryKey: ["people", searchQuery],
    queryFn: () => twenty.findManyPeople(searchQuery),
    staleTime: 5000,
  });

  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const session = await dbCommands.getSession({ id: sessionId });

      if (!session || !session.enhanced_memo_html) {
        return;
      }

      const note = await twenty.createOneNote(
        session.title,
        session.enhanced_memo_html,
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
    isEnhanced,
    handleSearch,
    handleSearchFocus,
    handleSelectPerson,
    handleRemovePerson,
    handleCreateNote: () => createNoteMutation.mutate({}),
    setShowSearchResults,
    setSearchQuery,
  };
};
