import { sep } from "@tauri-apps/api/path";
import { mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands as path2Commands } from "@hypr/plugin-path2";
import type { CalendarStorage } from "@hypr/store";

import { StoreOrMergeableStore } from "../../store/shared";
import { toFrontmatterMarkdown } from "../utils";

export function createCalendarMdPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  const label = "CalendarMdPersister";

  return createCustomPersister(
    store,
    async () => undefined,
    async () => {
      try {
        const base = await path2Commands.base();
        const calendarsDir = [base, "calendars"].join(sep());
        await mkdir(calendarsDir, { recursive: true });

        const calendars = (store.getTable("calendars" as any) ?? {}) as Record<
          string,
          CalendarStorage
        >;

        for (const [id, calendar] of Object.entries(calendars)) {
          const metadata: Record<string, unknown> = {
            id,
            user_id: calendar.user_id,
            created_at: calendar.created_at,
            tracking_id_calendar: calendar.tracking_id_calendar,
            name: calendar.name,
            enabled: calendar.enabled,
            provider: calendar.provider,
            source: calendar.source,
            color: calendar.color,
          };

          const content = toFrontmatterMarkdown(metadata);
          const filePath = [calendarsDir, `${id}.md`].join(sep());
          await writeTextFile(filePath, content);
        }
      } catch (error) {
        console.error(`[${label}] save error:`, error);
      }
    },
    () => null,
    () => {},
    (error) => console.error(`[${label}]:`, error),
    StoreOrMergeableStore,
  );
}
