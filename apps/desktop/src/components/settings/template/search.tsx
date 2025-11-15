import { Search } from "lucide-react";

export function TemplateSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 pl-4 pr-2 h-12">
      <Search className="size-4 text-neutral-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search templates..."
        className="flex-1 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none bg-transparent"
      />
    </div>
  );
}
