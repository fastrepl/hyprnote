import { SearchIcon } from "lucide-react";
import { useState } from "react";

export function Search() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex items-center h-full pl-4 flex-[0_1_260px] min-w-[160px] w-full">
      <div className="relative flex items-center w-full">
        <SearchIcon className="h-4 w-4 absolute left-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search anything..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-gray-100 focus:outline-none focus:bg-gray-200 border-0"
        />
      </div>
    </div>
  );
}
