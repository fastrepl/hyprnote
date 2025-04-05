import {
  WidgetHeader,
  type WidgetTwoByTwo,
  WidgetTwoByTwoWrapper,
} from "@hypr/ui/components/ui/widgets";
import { useSessions } from "@hypr/utils/contexts";

import { CreateNoteButton } from "../components/create-note-button";
import { ParticipantsList } from "../components/participants-list";
import { SearchInput } from "../components/search-input";
import { useTwentyNotes } from "../hooks/useTwentyNotes";

const Twenty2x2: WidgetTwoByTwo = () => {
  const sessionId = useSessions((s) => s.currentSessionId);

  return (
    <WidgetTwoByTwoWrapper>
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

      <WidgetBody sessionId={sessionId} />
    </WidgetTwoByTwoWrapper>
  );
};

function WidgetBody({ sessionId }: { sessionId: string | null }) {
  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center text-neutral-500">
          <p>No active session</p>
        </div>
      </div>
    );
  }

  const {
    selectedPeople,
    searchQuery,
    showSearchResults,
    searchResults,
    isLoading,
    searchRef,
    isMeetingActive,
    isEnhanced,
    isCreatingNote,
    handleSearch,
    handleSearchFocus,
    handleSelectPerson,
    handleRemovePerson,
    handleCreateNote,
    setShowSearchResults,
  } = useTwentyNotes(sessionId);

  return (
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
        isEnhanced={isEnhanced}
      />
    </div>
  );
}

export default Twenty2x2;
