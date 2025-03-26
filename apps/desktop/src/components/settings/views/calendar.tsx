import { Trans } from "@lingui/react/macro";
import { RiAppleFill as AppleIcon } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { type as getOsType } from "@tauri-apps/plugin-os";
import { open } from "@tauri-apps/plugin-shell";
import { useCallback } from "react";

import { client, getApiDesktopUserIntegrationsOptions, getIntegrationURL } from "@/client";
import { type CalendarIntegration } from "@/types";
import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { type Calendar } from "@hypr/plugin-db";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { Button } from "@hypr/ui/components/ui/button";

const supportedIntegrations: CalendarIntegration[] = [
  "apple-calendar",
  // "google-calendar",
  // "outlook-calendar",
];

export default function Calendar() {
  return (
    <div className="-mt-3">
      <ul className="flex flex-col px-1">
        {supportedIntegrations.map((type) => (
          <li key={type}>
            <Integration type={type} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoogleIcon() {
  return (
    <img
      className="h-4 w-4"
      src="/icons/gcal.svg"
    />
  );
}

function OutlookIcon() {
  return (
    <img
      className="h-4 w-4"
      src="/icons/outlook.svg"
    />
  );
}

function Integration({ type }: { type: CalendarIntegration }) {
  return (
    <Accordion type="single" collapsible defaultValue={"apple"}>
      <AccordionItem value="apple">
        <AccordionTrigger>
          <CalendarIconWithText type={type} />
        </AccordionTrigger>
        <AccordionContent className="px-2">
          {type === "apple-calendar"
            ? <AppleCalendarIntegrationDetails />
            : <CloudCalendarIntegrationDetails type={type} />}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function CloudCalendarIntegrationDetails({
  type,
}: {
  type: Exclude<CalendarIntegration, "apple-calendar">;
}) {
  const integrations = useQuery({
    ...getApiDesktopUserIntegrationsOptions({ client }),
  });

  const integration = integrations.data?.find((i) => i === type);
  const Icon = type === "google-calendar" ? GoogleIcon : OutlookIcon;

  const handleClickConnect = () => {
    const url = getIntegrationURL(type);
    open(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center">
            <Icon />
          </div>
          <div>
            <div className="text-sm font-medium">
              <Trans>
                {type === "google-calendar"
                  ? "Google Calendar"
                  : "Outlook Calendar"}
              </Trans>
            </div>
            <div className="text-xs text-muted-foreground">
              {integration
                ? <Trans>Calendar connected</Trans>
                : (
                  <Trans>
                    Connect your {type === "google-calendar" ? "Google" : "Outlook"} calendar to track upcoming events
                  </Trans>
                )}
            </div>
          </div>
        </div>
        <div>
          {integration
            ? "✅"
            : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClickConnect}
                className="min-w-12 text-center"
              >
                <Trans>Connect</Trans>
              </Button>
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
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border p-4">
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
          ? "✅"
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
          ? "✅"
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

function CalendarIconWithText({ type }: { type: CalendarIntegration }) {
  return (
    <div className="flex flex-row items-center gap-2">
      {type === "apple-calendar"
        ? <AppleIcon size={16} />
        : type === "google-calendar"
        ? <GoogleIcon />
        : <OutlookIcon />}
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
