import { CalendarOffIcon, CheckIcon } from "lucide-react";

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
}

export function CalendarSelection({
  groups,
  onToggle,
}: CalendarSelectionProps) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 border border-dashed border-border rounded-lg bg-muted/40">
        <CalendarOffIcon className="size-6 text-muted-foreground/60 mb-2" />
        <p className="text-xs text-muted-foreground">No calendars found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.sourceName}>
          <h5 className="text-xs font-medium text-muted-foreground mb-2">
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
  const color = calendar.color ?? "#888";

  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className="flex items-center gap-2 py-1 w-full text-left"
    >
      <div
        className={cn([
          "size-4 rounded shrink-0 flex items-center justify-center border",
          "transition-colors duration-100",
        ])}
        style={
          enabled
            ? { backgroundColor: color, borderColor: color }
            : { borderColor: "hsl(var(--border))" }
        }
      >
        {enabled && <CheckIcon className="size-3 text-white" strokeWidth={3} />}
      </div>
      <span className="text-sm truncate">{calendar.title}</span>
    </button>
  );
}
