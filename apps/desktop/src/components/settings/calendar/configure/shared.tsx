import { RefreshCwIcon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { Switch } from "@hypr/ui/components/ui/switch";

export interface CalendarItem {
  id: string;
  title: string;
  color?: string;
}

export interface CalendarGroup {
  sourceName: string;
  calendars: CalendarItem[];
}

interface CalendarSelectionProps {
  groups: CalendarGroup[];
  isLoading: boolean;
  isCalendarEnabled: (id: string) => boolean;
  onToggle: (calendar: CalendarItem, enabled: boolean) => void;
  onRefresh: () => void;
}

export function CalendarSelection({
  groups,
  isLoading,
  isCalendarEnabled,
  onToggle,
  onRefresh,
}: CalendarSelectionProps) {
  if (isLoading) {
    return (
      <div className="py-4 text-center text-sm text-neutral-500">
        Loading calendars...
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-neutral-500">
        No calendars found
      </div>
    );
  }

  return (
    <div className="pt-4 border-t mt-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Select Calendars</h4>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          className="size-7"
          aria-label="Refresh calendars"
        >
          <RefreshCwIcon className="size-4" />
        </Button>
      </div>
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.sourceName}>
            <h5 className="text-xs font-medium text-neutral-500 mb-2">
              {group.sourceName}
            </h5>
            <div className="space-y-2">
              {group.calendars.map((cal) => (
                <CalendarToggleRow
                  key={cal.id}
                  calendar={cal}
                  enabled={isCalendarEnabled(cal.id)}
                  onToggle={(enabled) => onToggle(cal, enabled)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
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
