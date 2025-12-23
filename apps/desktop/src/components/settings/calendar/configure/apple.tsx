import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { useEffect, useMemo } from "react";

import {
  commands as appleCalendarCommands,
  type CalendarColor,
} from "@hypr/plugin-apple-calendar";
import {
  commands as permissionsCommands,
  type PermissionStatus,
} from "@hypr/plugin-permissions";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/main";
import { PROVIDERS } from "../shared";
import {
  type CalendarGroup,
  type CalendarItem,
  CalendarSelection,
} from "./shared";

function useAccessPermission(config: {
  queryKey: string;
  checkPermission: () => Promise<
    | { status: "ok"; data: PermissionStatus }
    | { status: "error"; error: string }
  >;
  requestPermission: () => Promise<unknown>;
  openSettings: () => Promise<unknown>;
}) {
  const status = useQuery({
    queryKey: [config.queryKey],
    queryFn: async () => {
      const result = await config.checkPermission();
      if (result.status === "ok") {
        return result.data;
      }
      return "denied" as PermissionStatus;
    },
    refetchInterval: 1000,
  });

  const requestAccess = useMutation({
    mutationFn: config.requestPermission,
    onSuccess: () => {
      setTimeout(() => status.refetch(), 1000);
    },
  });

  const isAuthorized = status.data === "authorized";
  const isPending = requestAccess.isPending;

  const handleAction = async () => {
    if (isAuthorized) {
      await config.openSettings();
    } else if (status.data === "denied") {
      await config.openSettings();
    } else {
      requestAccess.mutate();
    }
  };

  return { status: status.data, isAuthorized, isPending, handleAction };
}

function AccessPermissionRow({
  title,
  grantedDescription,
  requestDescription,
  isAuthorized,
  isPending,
  onAction,
}: {
  title: string;
  grantedDescription: string;
  requestDescription: string;
  isAuthorized: boolean;
  isPending: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex-1">
        <div
          className={cn([
            "flex items-center gap-2 mb-1",
            !isAuthorized && "text-red-500",
          ])}
        >
          {!isAuthorized && <AlertCircleIcon className="size-4" />}
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <p className="text-xs text-neutral-600">
          {isAuthorized ? grantedDescription : requestDescription}
        </p>
      </div>
      <Button
        variant={isAuthorized ? "outline" : "default"}
        size="icon"
        onClick={onAction}
        disabled={isPending}
        className={cn([
          "size-8",
          isAuthorized && "bg-stone-100 text-stone-800 hover:bg-stone-200",
        ])}
        aria-label={
          isAuthorized
            ? `Open ${title.toLowerCase()} settings`
            : `Request ${title.toLowerCase()}`
        }
      >
        {isAuthorized ? (
          <CheckIcon className="size-5" />
        ) : (
          <ArrowRightIcon className="size-5" />
        )}
      </Button>
    </div>
  );
}

function appleColorToCss(color?: CalendarColor | null): string | undefined {
  if (!color) return undefined;
  return `rgba(${Math.round(color.red * 255)}, ${Math.round(color.green * 255)}, ${Math.round(color.blue * 255)}, ${color.alpha})`;
}

function useAppleCalendarSelection() {
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const calendarsTable = main.UI.useTable("calendars", main.STORE_ID);

  const {
    data: appleCalendars,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["appleCalendars"],
    queryFn: async () => {
      const operation = appleCalendarCommands.listCalendars();
      const minDelay = new Promise((resolve) => setTimeout(resolve, 500));

      const [result] = await Promise.all([operation, minDelay]);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const createCalendarRow = main.UI.useSetRowCallback(
    "calendars",
    (p: { id: string; name: string }) => p.id,
    (p: { id: string; name: string }) => ({
      user_id: user_id ?? "",
      created_at: new Date().toISOString(),
      name: p.name,
      enabled: false,
    }),
    [user_id],
    main.STORE_ID,
  );

  const updateCalendarName = main.UI.useSetCellCallback(
    "calendars",
    (p: { id: string; name: string }) => p.id,
    "name",
    (p: { id: string; name: string }) => p.name,
    [],
    main.STORE_ID,
  );

  useEffect(() => {
    if (!appleCalendars || !user_id) {
      return;
    }

    for (const cal of appleCalendars) {
      const existing = calendarsTable[cal.calendar_identifier];
      if (!existing) {
        createCalendarRow({ id: cal.calendar_identifier, name: cal.title });
      } else if (existing.name !== cal.title) {
        updateCalendarName({ id: cal.calendar_identifier, name: cal.title });
      }
    }
  }, [
    appleCalendars,
    user_id,
    calendarsTable,
    createCalendarRow,
    updateCalendarName,
  ]);

  const groups = useMemo((): CalendarGroup[] => {
    if (!appleCalendars) {
      return [];
    }

    const grouped = new Map<string, CalendarItem[]>();
    for (const cal of appleCalendars) {
      const sourceTitle = cal.source.title;
      if (!grouped.has(sourceTitle)) {
        grouped.set(sourceTitle, []);
      }
      grouped.get(sourceTitle)!.push({
        id: cal.calendar_identifier,
        title: cal.title,
        color: appleColorToCss(cal.color),
      });
    }

    return Array.from(grouped.entries()).map(([sourceName, calendars]) => ({
      sourceName,
      calendars,
    }));
  }, [appleCalendars]);

  const isCalendarEnabled = (calendarId: string): boolean => {
    const calendar = calendarsTable[calendarId];
    return calendar?.enabled === true;
  };

  const setCalendarRow = main.UI.useSetRowCallback(
    "calendars",
    (p: { calendarId: string; enabled: boolean }) => p.calendarId,
    (p: { calendarId: string; enabled: boolean }) => {
      const existing = calendarsTable[p.calendarId];
      if (!existing) {
        return {
          user_id: user_id ?? "",
          created_at: new Date().toISOString(),
          name: "",
          enabled: p.enabled,
        };
      }
      return {
        ...existing,
        enabled: p.enabled,
      };
    },
    [calendarsTable, user_id],
    main.STORE_ID,
  );

  const handleToggle = (calendar: CalendarItem, enabled: boolean) => {
    setCalendarRow({ calendarId: calendar.id, enabled });
  };

  return {
    groups,
    isCalendarEnabled,
    handleToggle,
    handleRefresh: refetch,
    isLoading: isFetching,
  };
}

function AppleCalendarSelection() {
  const { groups, isCalendarEnabled, handleToggle, handleRefresh, isLoading } =
    useAppleCalendarSelection();

  return (
    <CalendarSelection
      groups={groups}
      isCalendarEnabled={isCalendarEnabled}
      onToggle={handleToggle}
      onRefresh={handleRefresh}
      isLoading={isLoading}
    />
  );
}

export function AppleCalendarProviderCard() {
  const config = PROVIDERS.find((p) => p.id === "apple")!;

  const calendar = useAccessPermission({
    queryKey: "appleCalendarAccess",
    checkPermission: permissionsCommands.checkCalendarPermission,
    requestPermission: permissionsCommands.requestCalendarPermission,
    openSettings: permissionsCommands.openCalendarSettings,
  });

  const contacts = useAccessPermission({
    queryKey: "appleContactsAccess",
    checkPermission: permissionsCommands.checkContactsPermission,
    requestPermission: permissionsCommands.requestContactsPermission,
    openSettings: permissionsCommands.openContactsSettings,
  });

  return (
    <AccordionItem
      value={config.id}
      className="rounded-xl border-2 border-dashed bg-neutral-50"
    >
      <AccordionTrigger className="capitalize gap-2 px-4">
        <div className="flex items-center gap-2">
          {config.icon}
          <span>{config.displayName}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <div className="flex flex-col divide-y">
          <AccessPermissionRow
            title="Calendar Access"
            grantedDescription="Permission granted. Click to open settings."
            requestDescription="Grant access to sync events from your Apple Calendar"
            isAuthorized={calendar.isAuthorized}
            isPending={calendar.isPending}
            onAction={calendar.handleAction}
          />
          <AccessPermissionRow
            title="Contacts Access"
            grantedDescription="Permission granted. Click to open settings."
            requestDescription="Grant access to match participants with your contacts"
            isAuthorized={contacts.isAuthorized}
            isPending={contacts.isPending}
            onAction={contacts.handleAction}
          />
        </div>
        {calendar.isAuthorized && <AppleCalendarSelection />}
      </AccordionContent>
    </AccordionItem>
  );
}
