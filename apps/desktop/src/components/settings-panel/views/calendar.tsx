import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trans } from "@lingui/react/macro";
import { XIcon, CheckIcon } from "lucide-react";
import { RiAppleFill as AppleIcon } from "@remixicon/react";
import { Button } from "@hypr/ui/components/ui/button";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";

import { commands as dbCommands, type Calendar } from "@hypr/plugin-db";
import { type as getOsType } from "@tauri-apps/plugin-os";
import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";

import { type CalendarIntegration } from "@/types";
import {
  client,
  getApiNativeUserIntegrationsOptions,
  getIntegrationURL,
} from "@/client";

const supportedIntegrations: CalendarIntegration[] = [
  "apple-calendar",
  "google-calendar",
];

export default function Calendar() {
  const queryClient = useQueryClient();

  const calendars = useQuery({
    queryKey: ["settings", "calendars"],
    queryFn: async () => {
      const calendars = await dbCommands.listCalendars();
      return calendars;
    },
  });

  const mutation = useMutation({
    mutationFn: async ({
      calendar_id,
      selected,
    }: {
      calendar_id: Calendar["id"];
      selected: boolean;
    }) => {
      const calendar = calendars.data?.find(
        (calendar) => calendar.id === calendar_id,
      );
      if (calendar) {
        dbCommands.upsertCalendar({ ...calendar, selected });
        queryClient.invalidateQueries({ queryKey: ["settings", "calendars"] });
      }
    },
  });

  return (
    <div>
      <h3 className="text-sm font-medium ">Calendars</h3>
      <ul className="flex flex-col px-1">
        {supportedIntegrations.map((type) => (
          <li key={type}>
            <Integration type={type} />
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <div className="flex flex-row items-center gap-4">
          <Select
            value="new"
            onValueChange={(id) =>
              mutation.mutate({ calendar_id: id, selected: true })
            }
          >
            <SelectTrigger className="max-w-[100px] focus:outline-none focus:ring-0 focus:ring-offset-0  ">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem disabled value="new">
                New
              </SelectItem>
              {(calendars.data ?? [])
                .filter((calendar) => !calendar.selected)
                .map((calendar, i) => (
                  <SelectItem key={i} value={calendar.id}>
                    {calendar.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <ul className="mt-2 flex flex-col gap-2 pl-2">
          {(calendars.data ?? [])
            .filter((calendar) => calendar.selected)
            .map((calendar, i) => (
              <li
                key={i}
                className="flex flex-row justify-between rounded-md p-1 hover:bg-neutral-50  "
              >
                <div className="flex flex-row items-center gap-1">
                  <span>- {calendar.name}</span>
                </div>
                <button>
                  <XIcon
                    size={16}
                    onClick={() =>
                      mutation.mutate({
                        calendar_id: calendar.id,
                        selected: false,
                      })
                    }
                  />
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <img
      className="h-4 w-4"
      src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg"
    />
  );
}

function OutlookIcon() {
  return (
    <img
      className="h-4 w-4"
      src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg"
    />
  );
}

function Integration({ type }: { type: CalendarIntegration }) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>
          <CalendarIconWithText type={type} />
        </AccordionTrigger>
        <AccordionContent className="px-2">
          {type === "apple-calendar" ? (
            <AppleCalendarIntegrationDetails />
          ) : (
            <OauthCalendarIntegrationDetails type={type} />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function OauthCalendarIntegrationDetails({
  type,
}: {
  type: Exclude<CalendarIntegration, "apple-calendar">;
}) {
  const integrations = useQuery({
    ...getApiNativeUserIntegrationsOptions({ client }),
  });

  const integration = integrations.data?.find((i) => i === type);
  const Icon = type === "google-calendar" ? GoogleIcon : OutlookIcon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center">
            <Icon />
          </div>
          <div>
            <div className="text-sm font-medium ">
              <Trans>
                {type === "google-calendar"
                  ? "Google Calendar"
                  : "Outlook Calendar"}
              </Trans>
            </div>
            <div className="text-xs text-muted-foreground ">
              {integration ? (
                <Trans>Calendar connected</Trans>
              ) : (
                <Trans>Connect to sync your meetings</Trans>
              )}
            </div>
          </div>
        </div>
        <div>
          {integration ? (
            <Button variant="outline" size="sm" disabled={true}>
              <CheckIcon className="size-4 text-green-600" />
            </Button>
          ) : (
            <a href={getIntegrationURL(type)}>
              <Button variant="outline" size="sm">
                <Trans>Connect</Trans>
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function AppleCalendarIntegrationDetails() {
  const calendarAccess = useQuery({
    queryKey: ["settings", "calendarAccess"],
    queryFn: async () => appleCalendarCommands.calendarAccessStatus(),
  });

  const contactsAccess = useQuery({
    queryKey: ["settings", "contactsAccess"],
    queryFn: async () => appleCalendarCommands.contactsAccessStatus(),
  });

  const handleRequestCalendarAccess = useCallback(() => {
    if (getOsType() === "macos") {
      appleCalendarCommands.requestCalendarAccess();
    }
  }, []);

  const handleRequestContactsAccess = useCallback(() => {
    if (getOsType() === "macos") {
      appleCalendarCommands.requestContactsAccess();
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <img
            src="/icons/calendar.png"
            alt="Apple Calendar"
            className="size-6"
          />
          <div>
            <div className="text-sm font-medium ">
              <Trans>Calendar Access</Trans>
            </div>
            <div className="text-xs text-muted-foreground ">
              {calendarAccess.data ? (
                <Trans>Access granted</Trans>
              ) : (
                <Trans>Required for syncing calendar events</Trans>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRequestCalendarAccess}
          disabled={!!calendarAccess.data}
        >
          {calendarAccess.data ? (
            <CheckIcon className="size-4 text-green-600" />
          ) : (
            <Trans>Grant Access</Trans>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <img
            src="/icons/contacts.png"
            alt="Apple Contacts"
            className="size-6"
          />
          <div>
            <div className="text-sm font-medium ">
              <Trans>Contacts Access</Trans>
            </div>
            <div className="text-xs text-muted-foreground ">
              {contactsAccess.data ? (
                <Trans>Access granted</Trans>
              ) : (
                <Trans>Optional for participant suggestions</Trans>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRequestContactsAccess}
          disabled={!!contactsAccess.data}
        >
          {contactsAccess.data ? (
            <CheckIcon className="size-4 text-green-600" />
          ) : (
            <Trans>Grant Access</Trans>
          )}
        </Button>
      </div>
    </div>
  );
}

function CalendarIconWithText({ type }: { type: CalendarIntegration }) {
  return (
    <div className="flex flex-row items-center gap-2">
      {type === "apple-calendar" ? (
        <AppleIcon size={16} className="" />
      ) : type === "google-calendar" ? (
        <GoogleIcon />
      ) : (
        <OutlookIcon />
      )}
      <span className="text-sm ">
        {type === "apple-calendar"
          ? "Apple"
          : type === "google-calendar"
            ? "Google"
            : type === "outlook-calendar"
              ? "Outlook"
              : null}
      </span>
    </div>
  );
}
