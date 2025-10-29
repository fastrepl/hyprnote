import { Checkbox } from "@hypr/ui/components/ui/checkbox";

import * as main from "../../../../store/tinybase/main";

export function CalendarCheckboxRow(
  { id, checked, onToggle }: { id: string; checked: boolean; onToggle: (checked: boolean) => void },
) {
  const calendar = main.UI.useRow("calendars", id, main.STORE_ID);
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={`calendar-${id}`}
        checked={checked}
        onCheckedChange={(v) => onToggle(Boolean(v))}
      />
      <label
        htmlFor={`calendar-${id}`}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        {calendar?.name ?? "Untitled"}
      </label>
    </div>
  );
}
