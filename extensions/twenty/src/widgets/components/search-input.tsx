import { Loader, Search, User } from "lucide-react";
import { Dispatch, SetStateAction, RefObject } from "react";

interface SearchInputProps {
  searchQuery: string;
  handleSearch: (query: string) => Promise<void>;
  handleSearchFocus: () => Promise<void>;
  setShowSearchResults: Dispatch<SetStateAction<boolean>>;
  isMeetingActive: boolean;
  searchRef: RefObject<HTMLDivElement>;
  showSearchResults: boolean;
  searchResults: Array<any>;
  handleSelectPerson: (person: any) => void;
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
  handleSelectPerson,
  isLoading,
}: SearchInputProps) => {
  return (
    <div className="w-full mb-4" ref={searchRef}>
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
          <div className="absolute z-10 w-full mt-1 bg-white rounded-md border border-border overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader className="size-4 text-neutral-500 animate-spin mr-2" />
                <span className="text-sm text-neutral-500">Loading...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-60 overflow-auto">
                {searchResults.map((person) => (
                  <SearchResultItem 
                    key={person.id} 
                    person={person} 
                    handleSelectPerson={handleSelectPerson} 
                  />
                ))}
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-neutral-500">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SearchResultItemProps {
  person: any;
  handleSelectPerson: (person: any) => void;
}

const SearchResultItem = ({ person, handleSelectPerson }: SearchResultItemProps) => {
  return (
    <button
      type="button"
      className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
      onClick={() => handleSelectPerson(person)}
    >
      <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-blue-100 text-blue-600 rounded-full">
        <User className="size-3" />
      </span>
      <div className="flex flex-col">
        <span className="font-medium text-neutral-900 truncate">
          {person.name.firstName} {person.name.lastName}
        </span>
        <span className="text-xs text-neutral-500 truncate">
          {person.emails.primaryEmail}
        </span>
      </div>
    </button>
  );
};
