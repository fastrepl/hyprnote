import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { useMemo } from "react";

import {
  type AppleCalendar,
  commands as appleCalendarCommands,
} from "@hypr/plugin-apple-calendar";
import {
  commands as permissionsCommands,
  PermissionStatus,
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
import { CalendarGroup, CalendarItem, CalendarSelection } from "./shared";

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

  return { isAuthorized, isPending, handleAction };
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

function appleColorToCss(color?: AppleCalendar["color"]): string | undefined {
  if (!color) return undefined;
  return `rgba(${Math.round(color.red * 255)}, ${Math.round(color.green * 255)}, ${Math.round(color.blue * 255)}, ${color.alpha})`;
}

function useAppleCalendarSelection() {
  const queryClient = useQueryClient();
  const store = main.UI.useStore(main.STORE_ID);
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const storedCalendars = main.UI.useTable("calendars", main.STORE_ID);

  const { data: appleCalendars, isLoading } = useQuery({
    queryKey: ["appleCalendars"],
    queryFn: async () => {
      const result = await appleCalendarCommands.listCalendars();
      if (result.status === "ok") {
        return result.data;
      }
      throw new Error(result.error);
    },
  });

  const groups = useMemo((): CalendarGroup[] => {
    if (!appleCalendars) return [];

    const grouped = new Map<string, CalendarItem[]>();
    for (const cal of appleCalendars) {
      const sourceTitle = cal.source.title;
      if (!grouped.has(sourceTitle)) {
        grouped.set(sourceTitle, []);
      }
      grouped.get(sourceTitle)!.push({
        id: cal.id,
        title: cal.title,
        color: appleColorToCss(cal.color),
      });
    }

    return Array.from(grouped.entries()).map(([sourceName, calendars]) => ({
      sourceName,
      calendars,
    }));
  }, [appleCalendars]);

  const getCalendarRowId = (trackingId: string): string | undefined => {
    for (const [rowId, data] of Object.entries(storedCalendars)) {
      if (data.tracking_id === trackingId) {
        return rowId;
      }
    }
    return undefined;
  };

  const isCalendarEnabled = (trackingId: string): boolean => {
    for (const data of Object.values(storedCalendars)) {
      if (data.tracking_id === trackingId) {
        return data.enabled === 1;
      }
    }
    return false;
  };

  const handleToggle = (calendar: CalendarItem, enabled: boolean) => {
    if (!store || !user_id) return;

    const appleCalendar = appleCalendars?.find((c) => c.id === calendar.id);
    if (!appleCalendar) return;

    const existingRowId = getCalendarRowId(calendar.id);

    if (existingRowId) {
      store.setPartialRow("calendars", existingRowId, {
        enabled: enabled ? 1 : 0,
      });
    } else {
      const newRowId = crypto.randomUUID();
      store.setRow("calendars", newRowId, {
        user_id,
        created_at: new Date().toISOString(),
        tracking_id: calendar.id,
        name: calendar.title,
        source: appleCalendar.source.title,
        provider: "apple",
        enabled: enabled ? 1 : 0,
      });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["appleCalendars"] });
  };

  return { groups, isLoading, isCalendarEnabled, handleToggle, handleRefresh };
}

function AppleCalendarSelection() {
  const { groups, isCalendarEnabled, handleToggle, handleRefresh } =
    useAppleCalendarSelection();

  return (
    <CalendarSelection
      groups={groups}
      isCalendarEnabled={isCalendarEnabled}
      onToggle={handleToggle}
      onRefresh={handleRefresh}
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
