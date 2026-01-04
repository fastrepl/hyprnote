import { sep } from "@tauri-apps/api/path";
import { mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands as path2Commands } from "@hypr/plugin-path2";
import type { EventStorage } from "@hypr/store";

import { StoreOrMergeableStore } from "../../store/shared";
import { toFrontmatterMarkdown } from "../utils";

export function createEventPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  const label = "EventPersister";

  return createCustomPersister(
    store,
    async () => undefined,
    async () => {
      try {
        const base = await path2Commands.base();
        const eventsDir = [base, "events"].join(sep());
        await mkdir(eventsDir, { recursive: true });

        const events = (store.getTable("events" as any) ?? {}) as Record<
          string,
          EventStorage
        >;

        for (const [id, event] of Object.entries(events)) {
          const metadata: Record<string, unknown> = {
            id,
            user_id: event.user_id,
            created_at: event.created_at,
            tracking_id_event: event.tracking_id_event,
            calendar_id: event.calendar_id,
            title: event.title,
            started_at: event.started_at,
            ended_at: event.ended_at,
            location: event.location,
            meeting_link: event.meeting_link,
            description: event.description,
            ignored: event.ignored,
            recurrence_series_id: event.recurrence_series_id,
          };

          const noteContent = event.note || "";
          const content = toFrontmatterMarkdown(metadata, noteContent);
          const filePath = [eventsDir, `${id}.md`].join(sep());
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
