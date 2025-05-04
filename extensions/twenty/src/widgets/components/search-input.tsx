import { Loader, Search, User } from "lucide-react";
import { Dispatch, RefObject, SetStateAction } from "react";

import type { Person } from "../../client";

interface SearchInputProps {
  searchQuery: string;
  handleSearch: (query: string) => void;
  handleSearchFocus: () => void;
  setShowSearchResults: Dispatch<SetStateAction<boolean>>;
  isMeetingActive: boolean;
  searchRef: RefObject<HTMLDivElement>;
  showSearchResults: boolean;
  searchResults: Array<Person>;
  selectedPeople: Array<Person>;
  handleSelectPerson: (person: Person) => void;
  isLoading: boolean;
}

export const SearchInput = ({
  searchQuery,
  handleSearch,
  handleSearchFocus,
  setShowSearchResults,
  isMeetingActive,
  searchRef,
  showSearchResults,
  searchResults,
  selectedPeople,
  handleSelectPerson,
  isLoading,
}: SearchInputProps) => {
  const filteredResults = searchResults.filter(
    (person) => !selectedPeople.some((selected) => selected.id === person.id),
  );

  return (
    <div className="w-full" ref={searchRef}>
      <div className="flex items-center relative">
        <Search className="absolute left-3 size-4 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            handleSearch(e.target.value);
            setShowSearchResults(true);
          }}
          onFocus={() => handleSearchFocus()}
          placeholder="Search by name or email"
          className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400 border border-input rounded-md pl-9 pr-3 py-2 h-9 focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={isMeetingActive}
        />
      </div>

      {showSearchResults && (
        <div className="relative">
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 rounded-md border border-border dark:border-zinc-700 overflow-hidden">
            {isLoading
              ? (
                <div className="flex items-center justify-center p-4">
                  <Loader className="size-4 text-neutral-500 dark:text-neutral-400 animate-spin mr-2" />
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">Loading...</span>
                </div>
              )
              : filteredResults.length > 0
              ? (
                <div className="max-h-48 overflow-y-auto scrollbar-none">
                  {filteredResults.map((person) => (
                    <SearchResultItem
                      key={person.id}
                      person={person}
                      handleSelectPerson={handleSelectPerson}
                    />
                  ))}
                </div>
              )
              : (
                <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                  {searchResults.length > 0 && filteredResults.length === 0
                    ? "All matching people are already selected"
                    : "No results found"}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SearchResultItemProps {
  person: Person;
  handleSelectPerson: (person: Person) => void;
}

const SearchResultItem = ({ person, handleSelectPerson }: SearchResultItemProps) => {
  const fullName = `${person.name.firstName} ${person.name.lastName}`;
  const email = person.emails.primaryEmail;

  return (
    <button
      type="button"
      className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors w-full"
      onClick={() => handleSelectPerson(person)}
    >
      <div className="flex-shrink-0 size-8 flex items-center justify-center mr-2 rounded-full overflow-hidden">
        {person.avatarUrl
          ? (
            <img
              src={person.avatarUrl}
              alt={fullName}
              className="size-full object-cover"
            />
          )
          : (
            <div className="size-full flex items-center justify-center bg-blue-100 text-blue-600">
              <User className="size-4" />
            </div>
          )}
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-neutral-900 dark:text-neutral-200 truncate">
          {fullName}
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
          {email}
        </span>
      </div>
    </button>
  );
};
