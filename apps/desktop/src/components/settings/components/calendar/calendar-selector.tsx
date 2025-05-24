import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarCogIcon, RefreshCwIcon } from "lucide-react";

import { useHypr } from "@/contexts";
import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { type Calendar, commands as dbCommands } from "@hypr/plugin-db";
import { Checkbox } from "@hypr/ui/components/ui/checkbox";
import { cn } from "@hypr/ui/lib/utils";

export function CalendarSelector() {
  const { userId } = useHypr();

  const calendarsQuery = useQuery({
    queryKey: ["calendars"],
    queryFn: async () => {
      const calendars = await dbCommands.listCalendars(userId);
      const grouped = calendars.reduce((acc, calendar) => {
        let source = calendar.source || "Other";

        if (!source.includes("@")) {
          source = "Other";
        }

        acc[source] = acc[source] || [];
        acc[source].push(calendar);
        return acc;
      }, {} as Record<string, Calendar[]>);

      return {
        totalCount: calendars.length,
        selectedCount: calendars.filter((calendar) => calendar.selected).length,
        grouped,
      };
    },
    enabled: true,
  });

  const toggleCalendarSelectedMutation = useMutation({
    mutationFn: (calendar: Calendar) => dbCommands.toggleCalendarSelected(calendar.tracking_id),
    onSuccess: () => {
      calendarsQuery.refetch();
    },
    onError: console.error,
  });

  const syncCalendarsMutation = useMutation({
    mutationFn: async () => {
      const startTime = Date.now();
      const result = await appleCalendarCommands.syncCalendars();
      const elapsedTime = Date.now() - startTime;

      if (elapsedTime < 500) {
        await new Promise(resolve => setTimeout(resolve, 500 - elapsedTime));
      }

      return result;
    },
    onSuccess: () => {
      calendarsQuery.refetch();
    },
    onError: console.error,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-6 items-center justify-center">
          <CalendarCogIcon size={16} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">
              <Trans>Select Calendars</Trans>
            </div>
            <button
              disabled={syncCalendarsMutation.isPending}
              onClick={() => syncCalendarsMutation.mutate({})}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <RefreshCwIcon
                size={12}
                className={cn(
                  syncCalendarsMutation.isPending && "animate-spin",
                  "text-gray-500 hover:text-gray-700",
                )}
              />
            </button>
          </div>
          <div className="text-xs text-muted-foreground">
            <Trans>{calendarsQuery.data?.selectedCount ?? 0} calendars selected</Trans>
          </div>
        </div>
      </div>

      <div className="space-y-4 pl-9">
        {calendarsQuery.isLoading
          ? (
            <div className="text-sm text-muted-foreground">
              <Trans>Loading...</Trans>
            </div>
          )
          : calendarsQuery.data?.totalCount === 0
          ? (
            <div className="text-sm text-muted-foreground">
              <Trans>No calendars found</Trans>
            </div>
          )
          : (
            Object.entries(calendarsQuery.data?.grouped ?? {}).sort(([sourceA], [sourceB]) => {
              const isWorkEmail = (email: string) => {
                if (!email.includes("@")) {
                  return false;
                }

                const domain = email.split("@")[1]?.toLowerCase();

                const personalDomains = [
                  "gmail.com",
                  "yahoo.com",
                  "hotmail.com",
                  "outlook.com",
                  "icloud.com",
                  "aol.com",
                  "protonmail.com",
                  "mail.com",
                ];

                return domain && !personalDomains.includes(domain);
              };

              const isWorkEmailA = isWorkEmail(sourceA);
              const isWorkEmailB = isWorkEmail(sourceB);

              if (isWorkEmailA && !isWorkEmailB) {
                return -1;
              }
              if (!isWorkEmailA && isWorkEmailB) {
                return 1;
              }

              if (sourceA.includes("@") && !sourceB.includes("@")) {
                return -1;
              }
              if (!sourceA.includes("@") && sourceB.includes("@")) {
                return 1;
              }

              if (sourceA === "Other" && sourceB !== "Other") {
                return 1;
              }
              if (sourceA !== "Other" && sourceB === "Other") {
                return -1;
              }

              return sourceA.localeCompare(sourceB);
            }).map(([source, sourceCalendars]) => (
              <div key={source} className="mb-5">
                <div className="text-sm font-semibold text-gray-800 mb-2">{source}</div>
                <div className="pl-2 space-y-2.5">
                  {sourceCalendars
                    .sort((a, b) => {
                      // Check if calendar names contain email addresses
                      const aHasEmail = a.name.includes("@");
                      const bHasEmail = b.name.includes("@");

                      // Email-based calendars first
                      if (aHasEmail && !bHasEmail) {
                        return -1;
                      }
                      if (!aHasEmail && bHasEmail) {
                        return 1;
                      }

                      // Then alphabetical order
                      return a.name.localeCompare(b.name);
                    })
                    .map((calendar) => (
                      <div
                        key={calendar.id}
                        className="flex items-center space-x-3 py-1 px-2 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <Checkbox
                          id={`calendar-${calendar.id}`}
                          checked={calendar.selected}
                          onCheckedChange={() => toggleCalendarSelectedMutation.mutate(calendar)}
                          className="h-4 w-4"
                        />
                        <label
                          htmlFor={`calendar-${calendar.id}`}
                          className="text-sm font-medium cursor-pointer text-gray-700 flex-1"
                        >
                          {calendar.name}
                        </label>
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
      </div>
    </div>
  );
}
