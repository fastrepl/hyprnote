import { WidgetHeader, type WidgetTwoByTwo, WidgetTwoByTwoWrapper } from "@hypr/ui/components/ui/widgets";
import { useOngoingSession, useSession, useSessions } from "@hypr/utils/contexts";
import { useQuery } from "@tanstack/react-query";

import { ops as twenty } from "../../client";
import { CreateNoteButton } from "../components/create-note-button";
import { ParticipantsList } from "../components/participants-list";
import { SearchInput } from "../components/search-input";
import { useTwentyNotes } from "../hooks/useTwentyNotes";

const Twenty2x2: WidgetTwoByTwo = () => {
  const key = useQuery({
    queryKey: ["vault", "twenty-api-key"],
    queryFn: () => twenty.getApiKey(),
  });

  const sessionId = useSessions((s) => s.currentSessionId);

  return (
    <WidgetTwoByTwoWrapper>
      {!sessionId
        ? (
          <div className="flex items-center justify-center h-full p-4">
            <p>No active session</p>
          </div>
        )
        : !key.data
        ? (
          <div className="flex items-center justify-center h-full p-4">
            <p>No API key found for Twenty</p>
          </div>
        )
        : <Inner sessionId={sessionId} />}
    </WidgetTwoByTwoWrapper>
  );
};

function Inner({ sessionId }: { sessionId: string }) {
  const enhancedNote = useSession(sessionId, (s) => s.session.enhanced_memo_html);
  const ongoingSessionStatus = useOngoingSession((s) => s.status);

  const {
    selectedPeople,
    searchQuery,
    showSearchResults,
    searchResults,
    isLoading,
    searchRef,
    isMeetingActive,
    isCreatingNote,
    handleSearch,
    handleSearchFocus,
    handleSelectPerson,
    handleRemovePerson,
    handleCreateNote,
    setShowSearchResults,
  } = useTwentyNotes(sessionId);

  if (ongoingSessionStatus === "active") {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p>(Twenty) Meeting is still active</p>
      </div>
    );
  }

  if (!enhancedNote) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p>(Twenty) No enhanced note found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 pb-2">
        <WidgetHeader
          title={
            <div className="flex items-center gap-2">
              <img
                src="/assets/twenty-icon.jpg"
                className="size-5 rounded-md"
              />
              Create note
            </div>
          }
          actions={[]}
        />
      </div>
      {sessionId
        ? (
          <div className="overflow-y-auto flex-1 p-4 pt-0 gap-2 flex flex-col">
            <SearchInput
              searchQuery={searchQuery}
              handleSearch={handleSearch}
              handleSearchFocus={handleSearchFocus}
              setShowSearchResults={setShowSearchResults}
              isMeetingActive={isMeetingActive}
              searchRef={searchRef}
              showSearchResults={showSearchResults}
              searchResults={searchResults}
              selectedPeople={selectedPeople}
              handleSelectPerson={handleSelectPerson}
              isLoading={isLoading}
            />

            <ParticipantsList
              selectedPeople={selectedPeople}
              handleRemovePerson={handleRemovePerson}
              isMeetingActive={isMeetingActive}
            />

            <CreateNoteButton
              handleCreateNote={handleCreateNote}
              isCreatingNote={isCreatingNote}
              isMeetingActive={isMeetingActive}
              selectedPeopleCount={selectedPeople.length}
            />
          </div>
        )
        : (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center text-neutral-500">
              <p>No active session</p>
            </div>
          </div>
        )}
    </>
  );
}

export default Twenty2x2;
