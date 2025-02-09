import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Trans } from "@lingui/react/macro";
import { XIcon } from "lucide-react";
import { RiAppleFill as AppleIcon } from "@remixicon/react";

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

import { useHypr } from "@/contexts";
import { type Calendar, commands } from "@/types/tauri.gen";
import type { CalendarIntegration } from "@/types";

const supportedIntegrations: CalendarIntegration[] = [
  "apple-calendar",
  "google-calendar",
];

export default function Calendar() {
  const queryClient = useQueryClient();

  const calendars = useQuery({
    queryKey: ["settings", "calendars"],
    queryFn: async () => {
      const calendars = await commands.listCalendars();
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
        commands.upsertCalendar({ ...calendar, selected });
        queryClient.invalidateQueries({ queryKey: ["settings", "calendars"] });
      }
    },
  });

  return (
    <div>
      <h3 className="text-sm font-medium">Calendars</h3>
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
            <SelectTrigger className="max-w-[100px]">
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
                className="flex flex-row justify-between rounded-md p-1 hover:bg-neutral-50"
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
  const { client } = useHypr();
  const integrations = useQuery({
    queryKey: ["settings", "integration"],
    queryFn: async () => {
      const integrations = await client.listIntegrations();
      return integrations;
    },
  });

  const integration = integrations.data?.find((i) => i === type);

  return (
    <div>
      <p>
        {integration ? (
          <Trans>
            Calendar connected. Hyprnote will periodically sync your calendar
            events.
          </Trans>
        ) : (
          <Trans>
            To connect your Calendar, you need to{" "}
            <a href={client.getIntegrationURL(type)} className="underline">
              authorize Hypr to access your calendar.
            </a>
          </Trans>
        )}
      </p>
    </div>
  );
}

function AppleCalendarIntegrationDetails() {
  const calendarAccess = useQuery({
    queryKey: ["settings", "calendarAccess"],
    queryFn: async () => commands.checkPermissionStatus("calendar"),
  });

  const contactsAccess = useQuery({
    queryKey: ["settings", "contactsAccess"],
    queryFn: async () => commands.checkPermissionStatus("contacts"),
  });

  const handleRequestCalendarAccess = useCallback(() => {
    commands.openPermissionSettings("calendar");
  }, []);

  const handleRequestContactsAccess = useCallback(() => {
    commands.openPermissionSettings("contacts");
  }, []);

  return (
    <Trans>
      <p>
        {calendarAccess.data ? (
          <span>Calendar access granted.</span>
        ) : (
          <span>
            Calendar access not granted.{" "}
            <button onClick={handleRequestCalendarAccess}>
              This is required.
            </button>
          </span>
        )}
      </p>
      <p>
        {contactsAccess.data ? (
          <span>Contacts access granted.</span>
        ) : (
          <span>
            Contacts access not granted.{" "}
            <button onClick={handleRequestContactsAccess}>
              This is optional.
            </button>
          </span>
        )}
      </p>
    </Trans>
  );
}

function CalendarIconWithText({ type }: { type: CalendarIntegration }) {
  return (
    <div className="flex flex-row items-center gap-2">
      {type === "apple-calendar" ? (
        <AppleIcon size={16} />
      ) : type === "google-calendar" ? (
        <GoogleIcon />
      ) : (
        <OutlookIcon />
      )}
      <span className="text-sm">
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
