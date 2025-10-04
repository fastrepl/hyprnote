import { useQuery } from "@tanstack/react-query";
import { type as getOsType } from "@tauri-apps/plugin-os";
import { useCallback } from "react";

import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";
import { CalendarSelector } from "./calendar-selector";

export function AppleCalendarIntegrationDetails() {
  const calendarAccess = useQuery({
    queryKey: ["settings", "calendarAccess"],
    queryFn: () => appleCalendarCommands.calendarAccessStatus(),
    refetchInterval: 1000,
  });

  const contactsAccess = useQuery({
    queryKey: ["settings", "contactsAccess"],
    queryFn: () => appleCalendarCommands.contactsAccessStatus(),
    refetchInterval: 1000,
  });

  const handleRequestCalendarAccess = useCallback(() => {
    if (getOsType() === "macos") {
      appleCalendarCommands
        .requestCalendarAccess()
        .then(() => {
          calendarAccess.refetch();
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }, []);

  const handleRequestContactsAccess = useCallback(() => {
    if (getOsType() === "macos") {
      appleCalendarCommands
        .requestContactsAccess()
        .then(() => {
          contactsAccess.refetch();
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }, []);

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex flex-col rounded-lg border p-4",
          !calendarAccess.data && "bg-muted",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/icons/calendar.png"
              alt="Apple Calendar"
              className="size-6"
            />
            <div>
              <div className="text-sm font-medium">
                Calendar Access
              </div>
              <div className="text-xs text-muted-foreground">
                {calendarAccess.data
                  ? <p>Access granted</p>
                  : <p>Connect your calendar and track events</p>}
              </div>
            </div>
          </div>
          {!calendarAccess.data && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestCalendarAccess}
              className="min-w-12 text-center"
            >
              Grant Access
            </Button>
          )}
        </div>

        {calendarAccess.data && (
          <div className="mt-4 border-t pt-4">
            <CalendarSelector />
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex items-center justify-between rounded-lg border p-4",
          !contactsAccess.data && "bg-muted",
        )}
      >
        <div className="flex items-center gap-3">
          <img
            src="/icons/contacts.png"
            alt="Apple Contacts"
            className="size-6"
          />
          <div>
            <div className="text-sm font-medium">
              Contacts Access
            </div>
            <div className="text-xs text-muted-foreground">
              {contactsAccess.data
                ? <p>Access granted</p>
                : <p>Optional for participant suggestions</p>}
            </div>
          </div>
        </div>
        {!contactsAccess.data && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequestContactsAccess}
            className="min-w-12 text-center"
          >
            Grant Access
          </Button>
        )}
      </div>
    </div>
  );
}
