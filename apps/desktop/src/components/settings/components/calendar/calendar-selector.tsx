import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { type Calendar } from "@hypr/plugin-db";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { CalendarCogIcon } from "lucide-react";

export function CalendarSelector() {
  const queryClient = useQueryClient();

  const calendarsQuery = useQuery({
    queryKey: ["calendars"],
    queryFn: () => dbCommands.listCalendars(),
    enabled: true,
  });

  const toggleCalendarSelectedMutation = useMutation({
    mutationFn: (calendar: Calendar) =>
      dbCommands.toggleCalendarSelected(calendar.tracking_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendars"] });
    },
    onError: console.error,
  });

  const calendars = calendarsQuery.data || [];
  const selectedCount = calendars.filter((cal) => cal.selected).length;

  return (
    <div className="flex items-center justify-between">
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[100px]">
            <Trans>Choose</Trans>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <Trans>Your Calendars</Trans>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {calendarsQuery.isLoading ? (
            <div className="flex items-center justify-center py-2">
              <Trans>Loading...</Trans>
            </div>
          ) : calendars.length === 0 ? (
            <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
              <Trans>No calendars found</Trans>
            </div>
          ) : (
            calendars.map((calendar) => (
              <DropdownMenuCheckboxItem
                key={calendar.id}
                checked={calendar.selected}
                onCheckedChange={() =>
                  toggleCalendarSelectedMutation.mutate(calendar)
                }
                className="cursor-pointer"
              >
                {calendar.name}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
