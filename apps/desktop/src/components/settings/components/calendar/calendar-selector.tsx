import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCogIcon } from "lucide-react";

import { useHypr } from "@/contexts";
import { type Calendar } from "@hypr/plugin-db";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Checkbox } from "@hypr/ui/components/ui/checkbox";

export function CalendarSelector() {
  const queryClient = useQueryClient();
  const { userId } = useHypr();

  const calendarsQuery = useQuery({
    queryKey: ["calendars"],
    queryFn: () => dbCommands.listCalendars(userId),
    enabled: true,
  });

  const toggleCalendarSelectedMutation = useMutation({
    mutationFn: (calendar: Calendar) => dbCommands.toggleCalendarSelected(calendar.tracking_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendars"] });
    },
    onError: console.error,
  });

  const calendars = calendarsQuery.data || [];
  const selectedCount = calendars.filter((cal) => cal.selected).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex size-6 items-center justify-center">
          <CalendarCogIcon size={16} />
        </div>
        <div>
          <div className="text-sm font-medium">
            <Trans>Select Calendars</Trans>
          </div>
          <div className="text-xs text-muted-foreground">
            <Trans>{selectedCount} calendars selected</Trans>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-2 pl-9">
        {calendarsQuery.isLoading
          ? (
            <div className="text-sm text-muted-foreground">
              <Trans>Loading...</Trans>
            </div>
          )
          : calendars.length === 0
          ? (
            <div className="text-sm text-muted-foreground">
              <Trans>No calendars found</Trans>
            </div>
          )
          : (
            calendars.map((calendar) => (
              <div key={calendar.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`calendar-${calendar.id}`}
                  checked={calendar.selected}
                  onCheckedChange={() => toggleCalendarSelectedMutation.mutate(calendar)}
                />
                <label
                  htmlFor={`calendar-${calendar.id}`}
                  className="text-sm cursor-pointer"
                >
                  {calendar.name}
                </label>
              </div>
            ))
          )}
      </div>
    </div>
  );
}
