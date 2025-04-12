import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { type as getOsType } from "@tauri-apps/plugin-os";
import { useCallback } from "react";

import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { Button } from "@hypr/ui/components/ui/button";
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
      <div className="flex flex-col rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/icons/calendar.png"
              alt="Apple Calendar"
              className="size-6"
            />
            <div>
              <div className="text-sm font-medium">
                <Trans>Calendar Access</Trans>
              </div>
              <div className="text-xs text-muted-foreground">
                {calendarAccess.data
                  ? <Trans>Access granted</Trans>
                  : <Trans>Connect your calendar and track events</Trans>}
              </div>
            </div>
          </div>
          {calendarAccess.data
            ? (
              <div className="flex items-center gap-1.5">
                <div className="relative h-2 w-2">
                  <div className="absolute inset-0 rounded-full bg-green-500/30"></div>
                  <div className="absolute inset-0 rounded-full bg-green-500 animate-ping"></div>
                </div>
                <span className="text-xs text-green-600">
                  <Trans>Active</Trans>
                </span>
              </div>
            )
            : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestCalendarAccess}
                className="min-w-12 text-center"
              >
                <Trans>Grant Access</Trans>
              </Button>
            )}
        </div>

        {calendarAccess.data && (
          <div className="mt-4 border-t pt-4">
            <CalendarSelector />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <img
            src="/icons/contacts.png"
            alt="Apple Contacts"
            className="size-6"
          />
          <div>
            <div className="text-sm font-medium">
              <Trans>Contacts Access</Trans>
            </div>
            <div className="text-xs text-muted-foreground">
              {contactsAccess.data
                ? <Trans>Access granted</Trans>
                : <Trans>Optional for participant suggestions</Trans>}
            </div>
          </div>
        </div>
        {contactsAccess.data
          ? (
            <div className="flex items-center gap-1.5">
              <div className="relative h-2 w-2">
                <div className="absolute inset-0 rounded-full bg-green-500/30"></div>
                <div className="absolute inset-0 rounded-full bg-green-500 animate-ping"></div>
              </div>
              <span className="text-xs text-green-600">
                <Trans>Active</Trans>
              </span>
            </div>
          )
          : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestContactsAccess}
              className="min-w-12 text-center"
            >
              <Trans>Grant Access</Trans>
            </Button>
          )}
      </div>
    </div>
  );
}
