import { WidgetHeader, type WidgetTwoByTwo, WidgetTwoByTwoWrapper } from "@hypr/ui/components/ui/widgets";
import { useSessions } from "@hypr/utils/contexts";
import { type QueryClient } from "@tanstack/react-query";

import { safeNavigate } from "@hypr/utils/navigation";
import { CreateNoteButton } from "../components/create-note-button";
import { ParticipantsList } from "../components/participants-list";
import { SearchInput } from "../components/search-input";
import { useTwentyNotes } from "../hooks/useTwentyNotes";

const Twenty2x2: WidgetTwoByTwo = ({ queryClient }) => {
  const sessionId = useSessions((s) => s.currentSessionId);

  const handleOpenTwentySettings = () => {
    const extensionId = "@hypr/extension-twenty";
    const url = `/app/settings?tab=extensions&extension=${extensionId}`;
    safeNavigate({ type: "settings" }, url);
  };

  return (
    <WidgetTwoByTwoWrapper queryClient={queryClient}>
      <div className="p-4 pb-2">
        <WidgetHeader
          title={
            <div className="flex items-center gap-2">
              <button onClick={handleOpenTwentySettings}>
                <img
                  src="/assets/twenty-icon.jpg"
                  className="size-5 rounded-md cursor-pointer"
                  title="Configure Twenty extension"
                />
              </button>
              Upload note to Twenty
            </div>
          }
          actions={[]}
        />
      </div>

      {queryClient
        ? <WidgetBody sessionId={sessionId} queryClient={queryClient} />
        : (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center text-red-500">
              <p>Widget Configuration Error</p>
            </div>
          </div>
        )}
    </WidgetTwoByTwoWrapper>
  );
};

function WidgetBody({ sessionId, queryClient }: { sessionId: string | null; queryClient: QueryClient }) {
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
  } = useTwentyNotes(sessionId, queryClient);

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
