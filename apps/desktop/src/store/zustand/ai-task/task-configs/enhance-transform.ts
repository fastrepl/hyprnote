import { buildSegments, type RuntimeSpeakerHint } from "../../../../utils/segment";
import { convertStorageHintsToRuntime } from "../../../../utils/speaker-hints";
import type { Store as MainStore } from "../../../tinybase/main";
import type { TaskArgsMap, TaskArgsMapTransformed, TaskConfig } from ".";

export const enhanceTransform: Pick<TaskConfig<"enhance">, "transformArgs"> = {
  transformArgs,
};

async function transformArgs(
  args: TaskArgsMap["enhance"],
  store: MainStore,
): Promise<TaskArgsMapTransformed["enhance"]> {
  const { sessionId, templateId } = args;

  const rawMd = (store.getCell("sessions", sessionId, "raw_md") as string) || "";
  const sessionData = getSessionData(sessionId, store);
  const participants = getParticipants(sessionId, store);
  const segments = getTranscriptSegments(sessionId, store);
  const template = templateId ? getTemplateData(templateId, store) : undefined;

  return {
    sessionId,
    rawMd,
    sessionData,
    participants,
    segments,
    template,
  };
}

function getSessionData(sessionId: string, store: MainStore) {
  const rawTitle = store.getCell("sessions", sessionId, "title") as string;
  const eventId = store.getCell("sessions", sessionId, "event_id") as string;

  if (eventId) {
    return {
      title: store.getCell("events", eventId, "title") as string || rawTitle,
      started_at: store.getCell("events", eventId, "started_at") as string,
      ended_at: store.getCell("events", eventId, "ended_at") as string,
      location: store.getCell("events", eventId, "location") as string,
      description: store.getCell("events", eventId, "description") as string,
      is_event: true,
    };
  }

  return {
    title: rawTitle,
    is_event: false,
  };
}

function getParticipants(sessionId: string, store: MainStore) {
  const participantIds: string[] = [];

  store.forEachRow("mapping_session_participant", (mappingId, _forEachCell) => {
    const mappingSessionId = store.getCell("mapping_session_participant", mappingId, "session_id");
    if (mappingSessionId === sessionId) {
      const humanId = store.getCell("mapping_session_participant", mappingId, "human_id") as string;
      if (humanId) {
        participantIds.push(humanId);
      }
    }
  });

  return participantIds.map((humanId) => ({
    name: store.getCell("humans", humanId, "name") as string,
    job_title: store.getCell("humans", humanId, "job_title") as string,
  })).filter((p) => p.name);
}

function getTemplateData(templateId: string, store: MainStore) {
  const user_id = store.getCell("templates", templateId, "user_id") as string;
  const created_at = store.getCell("templates", templateId, "created_at") as string;
  const title = store.getCell("templates", templateId, "title") as string;
  const description = store.getCell("templates", templateId, "description") as string;
  const sectionsRaw = store.getCell("templates", templateId, "sections");

  let sectionsParsed: unknown = [];
  if (typeof sectionsRaw === "string") {
    try {
      sectionsParsed = JSON.parse(sectionsRaw);
    } catch (error) {
      console.error("Failed to parse template sections", error);
      sectionsParsed = [];
    }
  } else if (sectionsRaw !== undefined) {
    sectionsParsed = sectionsRaw;
  }

  const sections = Array.isArray(sectionsParsed)
    ? sectionsParsed
      .map((section) => {
        if (typeof section === "string") {
          return { title: section, description: "" };
        }

        if (section && typeof section === "object") {
          const maybeTitle = (section as any).title;
          const maybeDescription = (section as any).description;

          if (typeof maybeTitle === "string" && maybeTitle.trim().length > 0) {
            return {
              title: maybeTitle,
              description: typeof maybeDescription === "string" ? maybeDescription : "",
            };
          }
        }

        return null;
      })
      .filter((section): section is { title: string; description: string } => section !== null)
    : [];

  return {
    user_id,
    created_at,
    title,
    description,
    sections,
  };
}

function getTranscriptSegments(sessionId: string, store: MainStore) {
  const transcriptIds: string[] = [];
  const transcriptMap = new Map<string, number>();

  store.forEachRow("transcripts", (transcriptId, _forEachCell) => {
    const transcriptSessionId = store.getCell("transcripts", transcriptId, "session_id");
    if (transcriptSessionId === sessionId) {
      transcriptIds.push(transcriptId);
      const startedAt = store.getCell("transcripts", transcriptId, "started_at");
      transcriptMap.set(transcriptId, startedAt as number);
    }
  });

  if (transcriptIds.length === 0) {
    return [];
  }

  const finalWords: any[] = [];
  const wordIdToIndex = new Map<string, number>();
  const storageHints: any[] = [];

  transcriptIds.forEach((transcriptId) => {
    const transcriptStartedAt = transcriptMap.get(transcriptId) ?? 0;

    store.forEachRow("words", (wordId, _forEachCell) => {
      const wordTranscriptId = store.getCell("words", wordId, "transcript_id");
      if (wordTranscriptId === transcriptId) {
        const word = store.getRow("words", wordId);
        if (word) {
          wordIdToIndex.set(wordId, finalWords.length);
          finalWords.push({
            ...word,
            transcriptStartedAt,
          });
        }
      }
    });
  });

  store.forEachRow("speaker_hints", (hintId, _forEachCell) => {
    const hint = store.getRow("speaker_hints", hintId);
    if (hint) {
      storageHints.push(hint);
    }
  });

  const speakerHints: RuntimeSpeakerHint[] = convertStorageHintsToRuntime(storageHints, wordIdToIndex);
  const segments = buildSegments(finalWords, [], speakerHints);

  const sessionStartMs = transcriptIds.length > 0
    ? Math.min(...Array.from(transcriptMap.values()))
    : 0;

  return segments.map((segment) => {
    const firstWord = segment.words[0];
    const lastWord = segment.words[segment.words.length - 1];

    const absoluteStartMs = (firstWord as any).transcriptStartedAt + firstWord.start_ms;
    const absoluteEndMs = (lastWord as any).transcriptStartedAt + lastWord.end_ms;

    return {
      channel: segment.key.channel,
      start_ms: absoluteStartMs - sessionStartMs,
      end_ms: absoluteEndMs - sessionStartMs,
      text: segment.words.map((w) => w.text).join(" "),
      words: segment.words.map((w) => ({
        text: w.text,
        start_ms: (w as any).transcriptStartedAt + w.start_ms - sessionStartMs,
        end_ms: (w as any).transcriptStartedAt + w.end_ms - sessionStartMs,
      })),
    };
  }).sort((a, b) => a.start_ms - b.start_ms);
}
