import type { TaskArgsMap, TaskArgsMapTransformed, TaskConfig } from ".";
import { loadSessionAttachments } from "../../../../components/main/body/sessions/note-input/attachments/storage";
import {
  buildSegments,
  type RuntimeSpeakerHint,
  SegmentKey,
  type WordLike,
} from "../../../../utils/segment";
import { defaultRenderLabelContext } from "../../../../utils/segment/shared";
import { convertStorageHintsToRuntime } from "../../../../utils/speaker-hints";
import type { Store as MainStore } from "../../../tinybase/main";

type TranscriptMeta = {
  id: string;
  startedAt: number;
};

type WordRow = Record<string, unknown> & {
  text: string;
  start_ms: number;
  end_ms: number;
  channel: WordLike["channel"];
  transcript_id: string;
  is_final?: boolean;
  id?: string;
};

type WordWithTranscript = WordRow & { transcriptStartedAt: number };

type SegmentPayload = {
  speaker_label: string;
  start_ms: number;
  end_ms: number;
  text: string;
  words: Array<{ text: string; start_ms: number; end_ms: number }>;
};

export const enhanceTransform: Pick<TaskConfig<"enhance">, "transformArgs"> = {
  transformArgs,
};

async function transformArgs(
  args: TaskArgsMap["enhance"],
  store: MainStore,
): Promise<TaskArgsMapTransformed["enhance"]> {
  const { sessionId, enhancedNoteId, templateId } = args;

  const sessionContext = getSessionContext(sessionId, store);
  const template = templateId ? getTemplateData(templateId, store) : undefined;
  const attachments = await getSessionAttachments(sessionId);

  return {
    sessionId,
    enhancedNoteId,
    rawMd: sessionContext.rawMd,
    sessionData: sessionContext.sessionData,
    participants: sessionContext.participants,
    segments: sessionContext.segments,
    template,
    attachments,
  };
}

function getSessionContext(sessionId: string, store: MainStore) {
  return {
    rawMd: getStringCell(store, "sessions", sessionId, "raw_md"),
    sessionData: getSessionData(sessionId, store),
    participants: getParticipants(sessionId, store),
    segments: getTranscriptSegments(sessionId, store),
  };
}

function getSessionData(sessionId: string, store: MainStore) {
  const rawTitle = getStringCell(store, "sessions", sessionId, "title");
  const eventId = getOptionalStringCell(
    store,
    "sessions",
    sessionId,
    "event_id",
  );

  if (eventId) {
    return {
      title: getStringCell(store, "events", eventId, "title") || rawTitle,
      started_at: getStringCell(store, "events", eventId, "started_at"),
      ended_at: getStringCell(store, "events", eventId, "ended_at"),
      location: getStringCell(store, "events", eventId, "location"),
      description: getStringCell(store, "events", eventId, "description"),
      is_event: true,
    };
  }

  return {
    title: rawTitle,
    is_event: false,
  };
}

function getParticipants(sessionId: string, store: MainStore) {
  const participants: Array<{ name: string; job_title: string }> = [];

  store.forEachRow("mapping_session_participant", (mappingId, _forEachCell) => {
    const mappingSessionId = getOptionalStringCell(
      store,
      "mapping_session_participant",
      mappingId,
      "session_id",
    );
    if (mappingSessionId !== sessionId) {
      return;
    }

    const humanId = getOptionalStringCell(
      store,
      "mapping_session_participant",
      mappingId,
      "human_id",
    );
    if (!humanId) {
      return;
    }

    const name = getStringCell(store, "humans", humanId, "name");
    if (!name) {
      return;
    }

    participants.push({
      name,
      job_title: getStringCell(store, "humans", humanId, "job_title"),
    });
  });

  return participants;
}

function getTemplateData(templateId: string, store: MainStore) {
  return {
    user_id: getStringCell(store, "templates", templateId, "user_id"),
    created_at: getStringCell(store, "templates", templateId, "created_at"),
    title: getStringCell(store, "templates", templateId, "title"),
    description: getStringCell(store, "templates", templateId, "description"),
    sections: parseTemplateSections(
      store.getCell("templates", templateId, "sections"),
    ),
  };
}

function parseTemplateSections(raw: unknown) {
  let value: unknown = raw;

  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((section) => {
      if (typeof section === "string") {
        return { title: section, description: "" };
      }

      if (section && typeof section === "object") {
        const record = section as Record<string, unknown>;
        const title =
          typeof record.title === "string" ? record.title.trim() : "";
        if (!title) {
          return null;
        }

        const description =
          typeof record.description === "string" ? record.description : "";
        return { title, description };
      }

      return null;
    })
    .filter(
      (section): section is { title: string; description: string } =>
        section !== null,
    );
}

function getTranscriptSegments(sessionId: string, store: MainStore) {
  const transcripts = collectTranscripts(sessionId, store);
  if (transcripts.length === 0) {
    return [];
  }

  const wordIdToIndex = new Map<string, number>();
  const words = collectWordsForTranscripts(store, transcripts, wordIdToIndex);
  if (words.length === 0) {
    return [];
  }

  const speakerHints = collectSpeakerHints(store, wordIdToIndex);
  const segments = buildSegments(words, [], speakerHints);

  const sessionStartCandidate = transcripts.reduce(
    (min, transcript) => Math.min(min, transcript.startedAt),
    Number.POSITIVE_INFINITY,
  );
  const sessionStartMs = Number.isFinite(sessionStartCandidate)
    ? sessionStartCandidate
    : 0;

  const normalizedSegments = segments.reduce<SegmentPayload[]>(
    (acc, segment) => {
      if (segment.words.length === 0) {
        return acc;
      }

      acc.push(toSegmentPayload(segment as any, sessionStartMs, store));
      return acc;
    },
    [],
  );

  return normalizedSegments.sort((a, b) => a.start_ms - b.start_ms);
}

function collectTranscripts(
  sessionId: string,
  store: MainStore,
): TranscriptMeta[] {
  const transcripts: TranscriptMeta[] = [];

  store.forEachRow("transcripts", (transcriptId, _forEachCell) => {
    const transcriptSessionId = getOptionalStringCell(
      store,
      "transcripts",
      transcriptId,
      "session_id",
    );
    if (transcriptSessionId !== sessionId) {
      return;
    }

    const startedAt =
      getNumberCell(store, "transcripts", transcriptId, "started_at") ?? 0;
    transcripts.push({ id: transcriptId, startedAt });
  });

  return transcripts;
}

function collectWordsForTranscripts(
  store: MainStore,
  transcripts: readonly TranscriptMeta[],
  wordIdToIndex: Map<string, number>,
): WordWithTranscript[] {
  const transcriptStartById = new Map(
    transcripts.map((transcript) => [transcript.id, transcript.startedAt]),
  );
  const words: Array<{ id: string; word: WordWithTranscript }> = [];

  store.forEachRow("words", (wordId, _forEachCell) => {
    const row = store.getRow("words", wordId);
    if (!isWordRow(row)) {
      return;
    }

    const transcriptStartedAt = transcriptStartById.get(row.transcript_id);
    if (transcriptStartedAt === undefined) {
      return;
    }

    words.push({
      id: wordId,
      word: {
        ...row,
        transcriptStartedAt,
      },
    });
  });

  words.sort((a, b) => {
    const startA = a.word.transcriptStartedAt + a.word.start_ms;
    const startB = b.word.transcriptStartedAt + b.word.start_ms;
    return startA - startB;
  });

  return words.map(({ id, word }, index) => {
    wordIdToIndex.set(id, index);
    return word;
  });
}

function collectSpeakerHints(
  store: MainStore,
  wordIdToIndex: Map<string, number>,
): RuntimeSpeakerHint[] {
  const storageHints: any[] = [];

  store.forEachRow("speaker_hints", (hintId, _forEachCell) => {
    const hint = store.getRow("speaker_hints", hintId);
    if (hint) {
      storageHints.push(hint);
    }
  });

  return convertStorageHintsToRuntime(storageHints, wordIdToIndex);
}

function toSegmentPayload(
  segment: any,
  sessionStartMs: number,
  store: MainStore,
): SegmentPayload {
  const firstWord = segment.words[0];
  const lastWord = segment.words[segment.words.length - 1];

  const absoluteStartMs = firstWord.transcriptStartedAt + firstWord.start_ms;
  const absoluteEndMs = lastWord.transcriptStartedAt + lastWord.end_ms;

  const ctx = defaultRenderLabelContext(store);
  const label = SegmentKey.renderLabel(segment.key, ctx);

  return {
    speaker_label: label,
    start_ms: absoluteStartMs - sessionStartMs,
    end_ms: absoluteEndMs - sessionStartMs,
    text: segment.words.map((word: any) => word.text).join(" "),
    words: segment.words.map((word: any) => ({
      text: word.text,
      start_ms: word.transcriptStartedAt + word.start_ms - sessionStartMs,
      end_ms: word.transcriptStartedAt + word.end_ms - sessionStartMs,
    })),
  };
}

function isWordRow(row: unknown): row is WordRow {
  if (!row || typeof row !== "object") {
    return false;
  }

  const candidate = row as Record<string, unknown>;
  return (
    typeof candidate.text === "string" &&
    typeof candidate.start_ms === "number" &&
    typeof candidate.end_ms === "number" &&
    typeof candidate.channel === "number" &&
    typeof candidate.transcript_id === "string"
  );
}

function getStringCell(
  store: MainStore,
  tableId: any,
  rowId: string,
  columnId: string,
): string {
  const value = store.getCell(tableId, rowId, columnId);
  return typeof value === "string" ? value : "";
}

function getOptionalStringCell(
  store: MainStore,
  tableId: any,
  rowId: string,
  columnId: string,
): string | undefined {
  const value = store.getCell(tableId, rowId, columnId);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNumberCell(
  store: MainStore,
  tableId: any,
  rowId: string,
  columnId: string,
): number | undefined {
  const value = store.getCell(tableId, rowId, columnId);
  return typeof value === "number" ? value : undefined;
}

async function getSessionAttachments(sessionId: string) {
  try {
    const loaded = await loadSessionAttachments(sessionId);
    return loaded.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      fileUrl: attachment.fileUrl,
    }));
  } catch (error) {
    console.error("[enhance-transform] failed to load attachments", error);
    return [];
  }
}
