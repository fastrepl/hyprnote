import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { type as getOsType } from "@tauri-apps/plugin-os";
import { CalendarIcon, CheckCircle2Icon, UserIcon } from "lucide-react";
import { useCallback } from "react";

import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { Button } from "@hypr/ui/components/ui/button";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { cn } from "@hypr/ui/lib/utils";

interface PermissionItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  done: boolean | undefined;
  onRequest: () => void;
}

function PermissionItem({
  icon,
  title,
  description,
  done,
  onRequest,
}: PermissionItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4 transition-all duration-200",
        done ? "border-blue-500 bg-blue-50" : "bg-white border-neutral-200",
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-full flex-shrink-0",
            done ? "bg-blue-100" : "bg-neutral-50",
          )}
        >
          <div className={cn(done ? "text-blue-600" : "text-neutral-500")}>{icon}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{title}</div>
          <div className="text-sm text-muted-foreground">
            {done
              ? (
                <span className="text-blue-600 flex items-center gap-1">
                  <CheckCircle2Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <Trans>Access Granted</Trans>
                </span>
              )
              : <span className="block truncate pr-2">{description}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!done && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRequest}
            className="min-w-20"
          >
            <Trans>Enable</Trans>
          </Button>
        )}
        {done && (
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-100">
            <CheckCircle2Icon className="w-4 h-4 text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
}

interface CalendarPermissionsViewProps {
  onContinue: () => void;
}

export function CalendarPermissionsView({ onContinue }: CalendarPermissionsViewProps) {
  const calendarAccess = useQuery({
    queryKey: ["settings", "calendarAccess"],
    queryFn: () => appleCalendarCommands.calendarAccessStatus(),
    refetchInterval: 500,
  });

  const contactsAccess = useQuery({
    queryKey: ["settings", "contactsAccess"],
    queryFn: () => appleCalendarCommands.contactsAccessStatus(),
    refetchInterval: 500,
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
  }, [calendarAccess]);

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
  }, [contactsAccess]);

  return (
    <div className="flex flex-col items-center min-w-[30rem]">
      <h2 className="text-xl font-semibold mb-4">
        <Trans>Calendar & Contacts</Trans>
      </h2>

      <p className="text-center text-sm text-muted-foreground mb-8">
        <Trans>Connect your calendar and contacts for a better experience</Trans>
      </p>

      <div className="w-full max-w-[30rem] space-y-3 mb-8">
        <PermissionItem
          icon={<CalendarIcon className="h-5 w-5" />}
          title="Calendar Access"
          description="Track events & meetings"
          done={calendarAccess.data}
          onRequest={handleRequestCalendarAccess}
        />

        <PermissionItem
          icon={<UserIcon className="h-5 w-5" />}
          title="Contacts Access"
          description="Import meeting participants"
          done={contactsAccess.data}
          onRequest={handleRequestContactsAccess}
        />
      </div>

      <PushableButton
        onClick={onContinue}
        className="w-full max-w-sm"
      >
        <Trans>Continue</Trans>
      </PushableButton>

      <p className="text-xs text-muted-foreground text-center mt-4">
        <Trans>These permissions are optional but recommended</Trans>
      </p>
    </div>
  );
}
