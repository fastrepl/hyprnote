import { useMutation, useQuery } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useScheduleTaskRunCallback,
  useTaskRunRunning,
} from "tinytick/ui-react";

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

import { CALENDAR_SYNC_TASK_ID } from "../../../../services/apple-calendar";
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
  const {
    status: syncStatus,
    scheduleSync,
    scheduleDebouncedSync,
    cancelDebouncedSync,
  } = useSyncStatus();

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

  const syncActions = useMemo(
    () => ({ scheduleSync, scheduleDebouncedSync, cancelDebouncedSync }),
    [scheduleSync, scheduleDebouncedSync, cancelDebouncedSync],
  );

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
      <AccordionContent className="px-4 space-y-5">
        <InfoRow status={syncStatus} docsHref={config.docsPath} />

        <Section title="Permissions">
          <div className="space-y-1">
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
        </Section>

        {calendar.isAuthorized && (
          <AppleCalendarSelection syncActions={syncActions} />
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

const TOGGLE_SYNC_DEBOUNCE_MS = 5000;

type SyncStatus = "idle" | "scheduled" | "syncing";

function useSyncStatus() {
  const scheduleEventSync = useScheduleTaskRunCallback(
    CALENDAR_SYNC_TASK_ID,
    undefined,
    0,
  );
  const toggleSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [pendingTaskRunId, setPendingTaskRunId] = useState<string | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);

  const isTaskRunning = useTaskRunRunning(pendingTaskRunId ?? "");
  const isSyncing = pendingTaskRunId !== null && isTaskRunning === true;

  const status: SyncStatus = isSyncing
    ? "syncing"
    : isDebouncing
      ? "scheduled"
      : "idle";

  useEffect(() => {
    if (pendingTaskRunId && isTaskRunning === false) {
      setPendingTaskRunId(null);
    }
  }, [pendingTaskRunId, isTaskRunning]);

  useEffect(() => {
    return () => {
      if (toggleSyncTimeoutRef.current) {
        clearTimeout(toggleSyncTimeoutRef.current);
      }
    };
  }, []);

  const scheduleSync = useCallback(() => {
    const taskRunId = scheduleEventSync();
    if (taskRunId) {
      setPendingTaskRunId(taskRunId);
    }
  }, [scheduleEventSync]);

  const scheduleDebouncedSync = useCallback(() => {
    if (toggleSyncTimeoutRef.current) {
      clearTimeout(toggleSyncTimeoutRef.current);
    }
    setIsDebouncing(true);
    toggleSyncTimeoutRef.current = setTimeout(() => {
      toggleSyncTimeoutRef.current = null;
      setIsDebouncing(false);
      scheduleSync();
    }, TOGGLE_SYNC_DEBOUNCE_MS);
  }, [scheduleSync]);

  const cancelDebouncedSync = useCallback(() => {
    if (toggleSyncTimeoutRef.current) {
      clearTimeout(toggleSyncTimeoutRef.current);
      setIsDebouncing(false);
    }
  }, []);

  return { status, scheduleSync, scheduleDebouncedSync, cancelDebouncedSync };
}

function useAppleCalendarSelection(syncActions: {
  scheduleSync: () => void;
  scheduleDebouncedSync: () => void;
  cancelDebouncedSync: () => void;
}) {
  const store = main.UI.useStore(main.STORE_ID);
  const calendars = main.UI.useTable("calendars", main.STORE_ID);
  const { user_id } = main.UI.useValues(main.STORE_ID);

  const {
    data: incomingCalendars,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["appleCalendars"],
    queryFn: async () => {
      const [result] = await Promise.all([
        appleCalendarCommands.listCalendars(),
        new Promise((resolve) => setTimeout(resolve, 150)),
      ]);

      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  useEffect(() => {
    if (!incomingCalendars || !store || !user_id) return;

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
  }, [incomingCalendars, store, user_id]);

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

  const handleToggle = useCallback(
    (calendar: CalendarItem, enabled: boolean) => {
      store?.setPartialRow("calendars", calendar.id, { enabled });
      syncActions.scheduleDebouncedSync();
    },
    [store, syncActions],
  );

  const handleRefresh = useCallback(async () => {
    syncActions.cancelDebouncedSync();
    await refetch();
    syncActions.scheduleSync();
  }, [refetch, syncActions]);

  return {
    groups,
    handleToggle,
    handleRefresh,
    isLoading: isFetching,
  };
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-t border-neutral-200 pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          {title}
        </h4>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  status,
  docsHref,
}: {
  status: SyncStatus;
  docsHref: string;
}) {
  return (
    <div className="flex items-center justify-between border-t border-neutral-200 pt-4 pb-1">
      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
        <span
          className={cn([
            "size-1.5 rounded-full",
            status === "syncing" && "bg-blue-500 animate-pulse",
            status === "scheduled" && "bg-amber-500",
            status === "idle" && "bg-neutral-300",
          ])}
        />
        <span>
          {status === "syncing"
            ? "Syncing"
            : status === "scheduled"
              ? "Sync scheduled"
              : "Ready"}
        </span>
      </div>
      <button
        onClick={() => openUrl(docsHref)}
        className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        Docs ↗
      </button>
    </div>
  );
}

function AppleCalendarSelection({
  syncActions,
}: {
  syncActions: {
    scheduleSync: () => void;
    scheduleDebouncedSync: () => void;
    cancelDebouncedSync: () => void;
  };
}) {
  const { groups, handleToggle, handleRefresh, isLoading } =
    useAppleCalendarSelection(syncActions);

  return (
    <Section
      title="Calendars"
      action={
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="size-6"
          disabled={isLoading}
        >
          <RefreshCwIcon
            className={cn(["size-3.5", isLoading && "animate-spin"])}
          />
        </Button>
      }
    >
      <CalendarSelection groups={groups} onToggle={handleToggle} />
    </Section>
  );
}
