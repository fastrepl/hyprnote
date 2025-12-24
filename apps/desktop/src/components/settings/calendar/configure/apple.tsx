import { useMutation, useQuery } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AlertCircleIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { useMemo } from "react";

import {
  commands as appleCalendarCommands,
  colorToCSS,
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
import { findCalendarByTrackingId } from "../../../../utils/calendar";
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

export function AppleCalendarProviderCard() {
  const config = PROVIDERS.find((p) => p.id === "apple")!;

  const calendar = useAccessPermission({
    queryKey: "appleCalendarAccess",
    checkPermission: () => permissionsCommands.checkPermission("calendar"),
    requestPermission: () => permissionsCommands.requestPermission("calendar"),
    openSettings: () => permissionsCommands.openPermission("calendar"),
  });

  const contacts = useAccessPermission({
    queryKey: "appleContactsAccess",
    checkPermission: () => permissionsCommands.checkPermission("contacts"),
    requestPermission: () => permissionsCommands.requestPermission("contacts"),
    openSettings: () => permissionsCommands.openPermission("contacts"),
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
        <DocumentationLink href={config.docsPath} />

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

function useAppleCalendarSelection() {
  const store = main.UI.useStore(main.STORE_ID);
  const calendars = main.UI.useTable("calendars", main.STORE_ID);
  const { user_id } = main.UI.useValues(main.STORE_ID);

  const { mutate: syncCalendars, isPending } = useMutation({
    mutationKey: ["appleCalendars", "sync"],
    mutationFn: async () => {
      const [result] = await Promise.all([
        appleCalendarCommands.listCalendars(),
        new Promise((resolve) => setTimeout(resolve, 250)),
      ]);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (incomingCalendars) => {
      if (!store || !user_id) return;

      store.transaction(() => {
        for (const cal of incomingCalendars) {
          const existingRowId = findCalendarByTrackingId(store, cal.id);
          const rowId = existingRowId ?? crypto.randomUUID();
          const existing = existingRowId
            ? store.getRow("calendars", existingRowId)
            : null;

          store.setRow("calendars", rowId, {
            user_id,
            created_at: existing?.created_at || new Date().toISOString(),
            tracking_id_calendar: cal.id,
            name: cal.title,
            enabled: existing?.enabled ?? false,
            provider: "apple",
            source: cal.source.title,
            color: colorToCSS(cal.color),
          });
        }
      });
    },
  });

  const groups = useMemo((): CalendarGroup[] => {
    const appleCalendars = Object.entries(calendars).filter(
      ([_, cal]) => cal.provider === "apple",
    );

    const grouped = new Map<string, CalendarItem[]>();
    for (const [id, cal] of appleCalendars) {
      const source = cal.source || "Apple Calendar";
      if (!grouped.has(source)) grouped.set(source, []);
      grouped.get(source)!.push({
        id,
        title: cal.name || "Untitled",
        color: cal.color ?? "#888",
        enabled: cal.enabled ?? false,
      });
    }

    return Array.from(grouped.entries()).map(([sourceName, calendars]) => ({
      sourceName,
      calendars,
    }));
  }, [calendars]);

  const handleToggle = (calendar: CalendarItem, enabled: boolean) => {
    store?.setPartialRow("calendars", calendar.id, { enabled });
  };

  return {
    groups,
    handleToggle,
    handleRefresh: syncCalendars,
    isLoading: isPending,
  };
}

function AppleCalendarSelection() {
  const { groups, handleToggle, handleRefresh, isLoading } =
    useAppleCalendarSelection();

  return (
    <CalendarSelection
      groups={groups}
      onToggle={handleToggle}
      onRefresh={handleRefresh}
      isLoading={isLoading}
    />
  );
}

function DocumentationLink({ href }: { href: string }) {
  return (
    <button
      onClick={() => openUrl(href)}
      className="mb-3 text-xs text-neutral-500 hover:text-neutral-700 hover:underline"
    >
      Read the docs →
    </button>
  );
}
