import { WidgetHeader, type WidgetTwoByTwo, WidgetTwoByTwoWrapper } from "@hypr/ui/components/ui/widgets";
import { useSessions } from "@hypr/utils/contexts";

import { CreateNoteButton } from "../components/notes/CreateNoteButton";
import { ParticipantsList } from "../components/participants/ParticipantsList";
import { SearchInput } from "../components/search/SearchInput";
import { useTwentyNotes } from "../hooks/useTwentyNotes";

const Twenty2x2: WidgetTwoByTwo = () => {
  const sessionId = useSessions((s) => s.currentSessionId);
  const {
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
  } = useTwentyNotes();

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
      {sessionId && (
        <div className="p-4 pt-0 h-full flex flex-col">
          <SearchInput
            searchQuery={searchQuery}
            handleSearch={handleSearch}
            setShowSearchResults={setShowSearchResults}
            isMeetingActive={isMeetingActive}
            searchRef={searchRef}
            showSearchResults={showSearchResults}
            searchResults={searchResults}
            handleSelectPerson={handleSelectPerson}
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
      )}
    </WidgetTwoByTwoWrapper>
  );
};

export default Twenty2x2;
