import { RefreshCwIcon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { Switch } from "@hypr/ui/components/ui/switch";
import { cn } from "@hypr/utils";

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
  onRefresh: () => void;
  isLoading: boolean;
}

export function CalendarSelection({
  groups,
  onToggle,
  onRefresh,
  isLoading,
}: CalendarSelectionProps) {
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
        <h4 className="text-sm font-medium">Select Calendars </h4>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          className="size-7"
          disabled={isLoading}
        >
          <RefreshCwIcon
            className={cn("size-4", isLoading && "animate-spin")}
          />
        </Button>
      </div>
      <div className="space-y-4">
        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            Event fetching is not implemented yet. Calendar selection will be
            used once event syncing is available.
          </p>
        </div>

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
                  enabled={cal.enabled}
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
