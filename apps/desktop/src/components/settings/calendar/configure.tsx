import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckIcon,
  RefreshCwIcon,
} from "lucide-react";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import { Button } from "@hypr/ui/components/ui/button";
import { Switch } from "@hypr/ui/components/ui/switch";
import { cn } from "@hypr/utils";

import { useIsMacos } from "../../../hooks/usePlatform";
import * as main from "../../../store/tinybase/main";
import { PROVIDERS } from "./shared";

export function ConfigureProviders() {
  const isMacos = useIsMacos();

  const visibleProviders = PROVIDERS.filter(
    (p) => p.platform === "all" || (p.platform === "macos" && isMacos),
  );

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Configure Providers</h3>
      <Accordion type="single" collapsible className="space-y-3">
        {visibleProviders.map((provider) =>
          provider.id === "apple" ? (
            <AppleCalendarProviderCard key={provider.id} />
          ) : (
            <DisabledProviderCard key={provider.id} config={provider} />
          ),
        )}
      </Accordion>
    </div>
  );
}

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

function AppleCalendarProviderCard() {
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
        {calendar.isAuthorized && <CalendarSelection />}
      </AccordionContent>
    </AccordionItem>
  );
}

function CalendarSelection() {
  const queryClient = useQueryClient();
  const store = main.UI.useStore(main.STORE_ID);
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const storedCalendars = main.UI.useTable("calendars", main.STORE_ID);

  const {
    data: appleCalendars,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["appleCalendars"],
    queryFn: async () => {
      const result = await appleCalendarCommands.listCalendars();
      if (result.status === "ok") {
        return result.data;
      }
      throw new Error(result.error);
    },
  });

  const calendarsGroupedBySource = useMemo(() => {
    if (!appleCalendars) return new Map<string, AppleCalendar[]>();

    const grouped = new Map<string, AppleCalendar[]>();
    for (const cal of appleCalendars) {
      const sourceTitle = cal.source.title;
      if (!grouped.has(sourceTitle)) {
        grouped.set(sourceTitle, []);
      }
      grouped.get(sourceTitle)!.push(cal);
    }
    return grouped;
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
    return true;
  };

  const handleToggleCalendar = (calendar: AppleCalendar, enabled: boolean) => {
    if (!store || !user_id) return;

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
        source: calendar.source.title,
        provider: "apple",
        enabled: enabled ? 1 : 0,
      });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["appleCalendars"] });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="py-4 text-center text-sm text-neutral-500">
        Loading calendars...
      </div>
    );
  }

  if (!appleCalendars || appleCalendars.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-neutral-500">
        No calendars found
      </div>
    );
  }

  return (
    <div className="pt-4 border-t mt-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Select Calendars</h4>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="size-7"
          aria-label="Refresh calendars"
        >
          <RefreshCwIcon className="size-4" />
        </Button>
      </div>
      <div className="space-y-4">
        {Array.from(calendarsGroupedBySource.entries()).map(
          ([sourceName, calendars]) => (
            <div key={sourceName}>
              <h5 className="text-xs font-medium text-neutral-500 mb-2">
                {sourceName}
              </h5>
              <div className="space-y-2">
                {calendars.map((cal) => (
                  <CalendarToggleRow
                    key={cal.id}
                    calendar={cal}
                    enabled={isCalendarEnabled(cal.id)}
                    onToggle={(enabled) => handleToggleCalendar(cal, enabled)}
                  />
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function CalendarToggleRow({
  calendar,
  enabled,
  onToggle,
}: {
  calendar: AppleCalendar;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const colorStyle = calendar.color
    ? {
        backgroundColor: `rgba(${Math.round(calendar.color.red * 255)}, ${Math.round(calendar.color.green * 255)}, ${Math.round(calendar.color.blue * 255)}, ${calendar.color.alpha})`,
      }
    : undefined;

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="size-3 rounded-full shrink-0"
          style={colorStyle ?? { backgroundColor: "#888" }}
        />
        <span className="text-sm truncate">{calendar.title}</span>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}

function DisabledProviderCard({
  config,
}: {
  config: (typeof PROVIDERS)[number];
}) {
  return (
    <AccordionItem
      disabled
      value={config.id}
      className="rounded-xl border-2 border-dashed bg-neutral-50"
    >
      <AccordionTrigger
        className={cn([
          "capitalize gap-2 px-4",
          "cursor-not-allowed opacity-50",
        ])}
      >
        <div className="flex items-center gap-2">
          {config.icon}
          <span>{config.displayName}</span>
          {config.badge && (
            <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
              {config.badge}
            </span>
          )}
        </div>
      </AccordionTrigger>
    </AccordionItem>
  );
}
