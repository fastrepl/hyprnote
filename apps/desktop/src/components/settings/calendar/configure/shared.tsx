import { CalendarOffIcon } from "lucide-react";

import { Switch } from "@hypr/ui/components/ui/switch";

export interface CalendarItem {
  id: string;
  title: string;
  color: string;
  enabled: boolean;
}

export interface CalendarGroup {
  sourceName: string;
  calendars: CalendarItem[];
}

interface CalendarSelectionProps {
  groups: CalendarGroup[];
  onToggle: (calendar: CalendarItem, enabled: boolean) => void;
}

export function CalendarSelection({
  groups,
  onToggle,
}: CalendarSelectionProps) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 border border-dashed border-neutral-200 rounded-lg bg-neutral-50/50">
        <CalendarOffIcon className="size-6 text-neutral-300 mb-2" />
        <p className="text-xs text-neutral-500">No calendars found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.sourceName}>
          <h5 className="text-xs font-medium text-neutral-500 mb-2">
            {group.sourceName}
          </h5>
          <div className="flex flex-col gap-1">
            {group.calendars.map((cal) => (
              <CalendarToggleRow
                key={cal.id}
                calendar={cal}
                enabled={cal.enabled}
                onToggle={(enabled) => onToggle(cal, enabled)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarToggleRow({
  calendar,
  enabled,
  onToggle,
}: {
  calendar: CalendarItem;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="size-3 rounded-full shrink-0"
          style={{ backgroundColor: calendar.color ?? "#888" }}
        />
        <span className="text-sm truncate">{calendar.title}</span>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}
