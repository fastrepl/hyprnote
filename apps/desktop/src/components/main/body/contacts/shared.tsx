import { Plus } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";

export const getInitials = (name?: string | null) => {
  if (!name) {
    return "?";
  }
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export type SortOption = "alphabetical" | "oldest" | "newest";

export function SortDropdown({
  sortOption,
  setSortOption,
}: {
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
}) {
  return (
    <Select
      value={sortOption}
      onValueChange={(value: SortOption) => setSortOption(value)}
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
  );
}

export function ColumnHeader({
  title,
  sortOption,
  setSortOption,
  onAdd,
}: {
  title: string;
  sortOption?: SortOption;
  setSortOption?: (option: SortOption) => void;
  onAdd: () => void;
}) {
  return (
    <div className="px-3 py-2 border-b border-neutral-200 flex items-center justify-between h-12">
      <h3 className="text-xs font-medium text-neutral-600">{title}</h3>
      <div className="flex items-center gap-1">
        {sortOption && setSortOption && <SortDropdown sortOption={sortOption} setSortOption={setSortOption} />}
        <button
          onClick={onAdd}
          className="p-0.5 rounded hover:bg-neutral-100 transition-colors"
        >
          <Plus className="h-3 w-3 text-neutral-500" />
        </button>
      </div>
    </div>
  );
}
