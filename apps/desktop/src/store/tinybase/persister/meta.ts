import { writeTextFile } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import {
  ensureDirsExist,
  getDataDir,
  getSessionDir,
  iterateTableRows,
  type PersisterMode,
  type TablesContent,
} from "./utils";

export type ParticipantMeta = {
  human_id: string;
  name: string;
  email?: string;
  org_name?: string;
  job_title?: string;
  source?: string;
};

export type TagMeta = {
  tag_id: string;
  name: string;
};

export type EventMeta = {
  title: string;
  started_at: string;
  ended_at: string;
  location?: string;
  meeting_link?: string;
  description?: string;
};

export type SessionMetaJson = {
  id: string;
  title: string;
  created_at: string;
  folder_id?: string;
  event_id?: string;
  participants: ParticipantMeta[];
  tags: TagMeta[];
  event?: EventMeta;
};

export function collectSessionMeta(
  tables: TablesContent | undefined,
): Map<string, SessionMetaJson> {
  const sessionMetaMap = new Map<string, SessionMetaJson>();

  const sessions = iterateTableRows(tables, "sessions");
  const mappingParticipants = iterateTableRows(
    tables,
    "mapping_session_participant",
  );
  const mappingTags = iterateTableRows(tables, "mapping_tag_session");
  const humans = iterateTableRows(tables, "humans");
  const organizations = iterateTableRows(tables, "organizations");
  const tags = iterateTableRows(tables, "tags");
  const events = iterateTableRows(tables, "events");

  const humanMap = new Map(humans.map((h) => [h.id, h]));
  const orgMap = new Map(organizations.map((o) => [o.id, o]));
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const eventMap = new Map(events.map((e) => [e.id, e]));

  const participantsBySession = new Map<string, ParticipantMeta[]>();
  for (const mapping of mappingParticipants) {
    const sessionId = mapping.session_id;
    const humanId = mapping.human_id;
    if (!sessionId || !humanId) continue;

    const human = humanMap.get(humanId);
    if (!human) continue;

    const org = human.org_id ? orgMap.get(human.org_id) : undefined;

    const participant: ParticipantMeta = {
      human_id: humanId,
      name: human.name || "",
      ...(human.email && { email: human.email }),
      ...(org?.name && { org_name: org.name }),
      ...(human.job_title && { job_title: human.job_title }),
      ...(mapping.source && { source: mapping.source }),
    };

    const list = participantsBySession.get(sessionId) ?? [];
    list.push(participant);
    participantsBySession.set(sessionId, list);
  }

  const tagsBySession = new Map<string, TagMeta[]>();
  for (const mapping of mappingTags) {
    const sessionId = mapping.session_id;
    const tagId = mapping.tag_id;
    if (!sessionId || !tagId) continue;

    const tag = tagMap.get(tagId);
    if (!tag) continue;

    const tagMeta: TagMeta = {
      tag_id: tagId,
      name: tag.name || "",
    };

    const list = tagsBySession.get(sessionId) ?? [];
    list.push(tagMeta);
    tagsBySession.set(sessionId, list);
  }

  for (const session of sessions) {
    const sessionId = session.id;

    let eventMeta: EventMeta | undefined;
    if (session.event_id) {
      const event = eventMap.get(session.event_id);
      if (event) {
        eventMeta = {
          title: event.title || "",
          started_at: event.started_at || "",
          ended_at: event.ended_at || "",
          ...(event.location && { location: event.location }),
          ...(event.meeting_link && { meeting_link: event.meeting_link }),
          ...(event.description && { description: event.description }),
        };
      }
    }

    const meta: SessionMetaJson = {
      id: sessionId,
      title: session.title || "",
      created_at: session.created_at || "",
      ...(session.folder_id && { folder_id: session.folder_id }),
      ...(session.event_id && { event_id: session.event_id }),
      participants: participantsBySession.get(sessionId) ?? [],
      tags: tagsBySession.get(sessionId) ?? [],
      ...(eventMeta && { event: eventMeta }),
    };

    sessionMetaMap.set(sessionId, meta);
  }

  return sessionMetaMap;
}

export function createMetaPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  const saveFn =
    config.mode === "load-only"
      ? async () => {}
      : async (getContent: () => unknown) => {
          const [tables] = getContent() as [TablesContent | undefined, unknown];
          const dataDir = await getDataDir();

          const sessionMetaMap = collectSessionMeta(tables);
          if (sessionMetaMap.size === 0) {
            return;
          }

          const dirs = new Set<string>();
          const writeOperations: Array<{ path: string; content: string }> = [];

          for (const [sessionId, meta] of sessionMetaMap) {
            const sessionDir = getSessionDir(dataDir, sessionId);
            dirs.add(sessionDir);

            writeOperations.push({
              path: `${sessionDir}/_meta.json`,
              content: JSON.stringify(meta, null, 2),
            });
          }

          try {
            await ensureDirsExist(dirs);
          } catch (e) {
            console.error("Failed to ensure dirs exist:", e);
            return;
          }

          for (const op of writeOperations) {
            try {
              await writeTextFile(op.path, op.content);
            } catch (e) {
              console.error(`Failed to write ${op.path}:`, e);
            }
          }
        };

  return createCustomPersister(
    store,
    async () => {
      return undefined;
    },
    saveFn,
    (listener) => setInterval(listener, 1000),
    (interval) => clearInterval(interval),
  );
}
