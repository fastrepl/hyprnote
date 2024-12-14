interface SearchBarProps {
  onSearchClick: () => void;
}

export default function SearchBar({ onSearchClick }: SearchBarProps) {
  return (
    <div className="relative">
      <button
        onClick={onSearchClick}
        className="flex items-center gap-2 rounded-md sm:bg-gray-100 sm:py-2 sm:pl-3 sm:pr-2"
        aria-label="검색"
      >
        <svg
          className="h-4 w-4 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span className="hidden text-xs text-gray-600 sm:inline">
          검색...
          <span className="ml-4 rounded bg-gray-300 px-2 py-0.5 text-xs">
            ⌘K
          </span>
        </span>
      </button>
    </div>
  );
}
