import { Plus } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/ui/lib/utils";
import { getInitials } from "./shared";

export function PeopleColumn({
  displayPeople,
  selectedPerson,
  setSelectedPerson,
  sortOption,
  setSortOption,
}: {
  displayPeople: any[];
  selectedPerson: string | null;
  setSelectedPerson: (id: string | null) => void;
  sortOption: "alphabetical" | "oldest" | "newest";
  setSortOption: (option: "alphabetical" | "oldest" | "newest") => void;
}) {
  return (
    <div className="w-[250px] border-r border-neutral-200 flex flex-col">
      <div className="px-3 py-2 border-b border-neutral-200 flex items-center justify-between h-12">
        <h3 className="text-xs font-medium text-neutral-600">People</h3>
        <div className="flex items-center gap-1">
          <Select
            value={sortOption}
            onValueChange={(value: "alphabetical" | "oldest" | "newest") => setSortOption(value)}
          >
            <SelectTrigger className="w-[90px] h-6 text-xs border-0 bg-transparent hover:bg-neutral-100 focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical" className="text-xs">
                A-Z
              </SelectItem>
              <SelectItem value="oldest" className="text-xs">
                Oldest
              </SelectItem>
              <SelectItem value="newest" className="text-xs">
                Newest
              </SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => {
            }}
            className="p-0.5 rounded hover:bg-neutral-100 transition-colors"
          >
            <Plus className="h-3 w-3 text-neutral-500" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {displayPeople.map((person: any) => (
            <button
              key={person.id}
              onClick={() => setSelectedPerson(person.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm hover:bg-neutral-100 transition-colors flex items-center gap-2",
                selectedPerson === person.id && "bg-neutral-100",
              )}
            >
              <div className="flex-shrink-0 w-8  rounded-full bg-neutral-200 flex items-center justify-center">
                <span className="text-xs font-medium text-neutral-600">
                  {getInitials(person.name || person.email)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-1">
                  {person.name || person.email || "Unnamed"}
                  {person.is_user && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">You</span>
                  )}
                </div>
                {person.email && person.name && <div className="text-xs text-neutral-500 truncate">{person.email}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
