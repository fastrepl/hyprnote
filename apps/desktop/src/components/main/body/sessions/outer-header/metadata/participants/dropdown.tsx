import { cn } from "@hypr/utils";

type DropdownOption = {
  id: string;
  name: string;
  isNew?: boolean;
  email?: string;
  orgId?: string;
  jobTitle?: string;
};

export function ParticipantDropdown({
  options,
  selectedIndex,
  onSelect,
  onHover,
}: {
  options: DropdownOption[];
  selectedIndex: number;
  onSelect: (option: DropdownOption) => void;
  onHover: (index: number) => void;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md overflow-hidden">
      <div className="max-h-[200px] overflow-auto py-1">
        {options.map((option, index) => (
          <button
            key={option.id}
            type="button"
            className={cn([
              "w-full px-3 py-1.5 text-left text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              selectedIndex === index && "bg-accent text-accent-foreground",
            ])}
            onClick={() => onSelect(option)}
            onMouseEnter={() => onHover(index)}
          >
            {option.isNew ? (
              <span>
                Add "<span className="font-medium">{option.name}</span>"
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="font-medium">{option.name}</span>
                {option.jobTitle && (
                  <span className="text-xs text-muted-foreground">
                    {option.jobTitle}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
