import { useQuery } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";

import {
  commands as appleCalendarCommands,
  colorToCSS,
} from "@hypr/plugin-apple-calendar";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import * as main from "../../../../../store/tinybase/main";
import { findCalendarByTrackingId } from "../../../../../utils/calendar";
import {
  type CalendarGroup,
  type CalendarItem,
  CalendarSelection,
} from "../shared";
import { Section } from "./index";
import { SyncIndicator } from "./sync";

export function AppleCalendarSelection({
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
        <div className="flex items-center gap-2">
          <SyncIndicator />

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
        </div>
      }
    >
      <div className="pt-0.5"></div>
      <CalendarSelection groups={groups} onToggle={handleToggle} />
    </Section>
  );
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
