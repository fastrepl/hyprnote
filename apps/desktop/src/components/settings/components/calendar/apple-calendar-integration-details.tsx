import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type as getOsType } from "@tauri-apps/plugin-os";
import { useCallback, useState } from "react";

import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";
import { CalendarSelector } from "./calendar-selector";
import { ICloudCredentialsModal } from "./icloud-credentials-modal";

export function AppleCalendarIntegrationDetails() {
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const osType = getOsType();
  
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
    if (osType === "macos") {
      appleCalendarCommands
        .requestCalendarAccess()
        .then(() => {
          calendarAccess.refetch();
        })
        .catch((error) => {
          console.error(error);
        });
    } else {
      // On Linux, show the credentials modal
      setIsCredentialsModalOpen(true);
    }
  }, [osType, calendarAccess]);

  const handleRequestContactsAccess = useCallback(() => {
    if (osType === "macos") {
      appleCalendarCommands
        .requestContactsAccess()
        .then(() => {
          contactsAccess.refetch();
        })
        .catch((error) => {
          console.error(error);
        });
    } else {
      // On Linux, show the credentials modal (same as calendar)
      setIsCredentialsModalOpen(true);
    }
  }, [osType, contactsAccess]);
  
  const handleCredentialsSaved = useCallback(() => {
    calendarAccess.refetch();
    contactsAccess.refetch();
  }, [calendarAccess, contactsAccess]);

  const syncContactsMutation = useMutation({
    mutationFn: async () => {
      const result = await appleCalendarCommands.syncContacts();
      return result;
    },
  });

  return (
    <div className="space-y-2">
      <ICloudCredentialsModal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        onSuccess={handleCredentialsSaved}
      />
      
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
                <Trans>Calendar Access</Trans>
              </div>
              <div className="text-xs text-muted-foreground">
                {calendarAccess.data
                  ? <Trans>Access granted</Trans>
                  : <Trans>Connect your calendar and track events</Trans>}
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
              {osType === "macos" ? <Trans>Grant Access</Trans> : <Trans>Configure iCloud</Trans>}
            </Button>
          )}
          {calendarAccess.data && osType !== "macos" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCredentialsModalOpen(true)}
              className="min-w-12 text-center"
            >
              <Trans>Edit Credentials</Trans>
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
          "flex flex-col rounded-lg border p-4",
          !contactsAccess.data && "bg-muted",
        )}
      >
        <div className="flex items-center justify-between">
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
          {!contactsAccess.data && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestContactsAccess}
              className="min-w-12 text-center"
            >
              {osType === "macos" ? <Trans>Grant Access</Trans> : <Trans>Configure iCloud</Trans>}
            </Button>
          )}
        </div>

        {contactsAccess.data && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div className="text-xs text-muted-foreground">
              <Trans>Sync your contacts to enable participant suggestions</Trans>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={syncContactsMutation.isPending}
              onClick={() => syncContactsMutation.mutate()}
              className="min-w-12 text-center"
            >
              <svg
                className={cn(
                  "size-4",
                  syncContactsMutation.isPending && "animate-spin",
                )}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
