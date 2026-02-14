import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { useCallback, useEffect, useRef, useState } from "react";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import { useAuth } from "../auth";
import { env } from "../env";
import * as main from "../store/tinybase/store/main";
import type { SpeakerHintWithId, WordWithId } from "../store/transcript/types";
import {
  updateTranscriptHints,
  updateTranscriptWords,
} from "../store/transcript/utils";
import { id as generateId } from "../utils";
import { useUploadAudio } from "./useUploadAudio";

type PipelineStatus = "QUEUED" | "TRANSCRIBING" | "DONE" | "ERROR";

type TranscriptToken = {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: number;
};

type StatusResponse = {
  status: PipelineStatus;
  transcript?: string;
  tokens?: TranscriptToken[];
  error?: string;
};

type CloudRetranscribeState = {
  phase: "idle" | "uploading" | "processing" | "done" | "error";
  error: string | null;
};

const JOB_STORAGE_PREFIX = "cloud_retranscribe_job:";

function saveJob(sessionId: string, workflowKey: string) {
  localStorage.setItem(
    `${JOB_STORAGE_PREFIX}${sessionId}`,
    JSON.stringify({ workflowKey, createdAt: Date.now() }),
  );
}

function loadJob(sessionId: string): string | null {
  const raw = localStorage.getItem(`${JOB_STORAGE_PREFIX}${sessionId}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const age = Date.now() - (parsed.createdAt ?? 0);
    // Discard jobs older than 15 minutes
    if (age > 15 * 60 * 1000) {
      localStorage.removeItem(`${JOB_STORAGE_PREFIX}${sessionId}`);
      return null;
    }
    return parsed.workflowKey ?? null;
  } catch {
    localStorage.removeItem(`${JOB_STORAGE_PREFIX}${sessionId}`);
    return null;
  }
}

function removeJob(sessionId: string) {
  localStorage.removeItem(`${JOB_STORAGE_PREFIX}${sessionId}`);
}

async function startPipeline(
  fileId: string,
  accessToken: string,
): Promise<string> {
  const resp = await tauriFetch(`${env.VITE_API_URL}/stt/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ fileId }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `Failed to start pipeline (${resp.status})`);
  }

  const data: { id: string } = await resp.json();
  return data.id;
}

async function fetchPipelineStatus(
  pipelineId: string,
  accessToken: string,
): Promise<StatusResponse> {
  const resp = await tauriFetch(
    `${env.VITE_API_URL}/stt/status/${encodeURIComponent(pipelineId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `Failed to get status (${resp.status})`);
  }

  return resp.json();
}

function writeTokensToStore(
  store: ReturnType<typeof main.UI.useStore>,
  sessionId: string,
  userId: string,
  tokens: TranscriptToken[],
) {
  if (!store || tokens.length === 0) return;

  const transcriptId = generateId();

  store.setRow("transcripts", transcriptId, {
    session_id: sessionId,
    user_id: userId,
    created_at: new Date().toISOString(),
    started_at: tokens[0]?.startMs ?? Date.now(),
    words: "[]",
    speaker_hints: "[]",
  });

  const words: WordWithId[] = [];
  const hints: SpeakerHintWithId[] = [];

  for (const token of tokens) {
    const wordId = generateId();
    words.push({
      id: wordId,
      text: token.text,
      start_ms: token.startMs,
      end_ms: token.endMs,
      channel: 0,
    });

    if (token.speaker != null) {
      hints.push({
        id: generateId(),
        word_id: wordId,
        type: "provider_speaker_index",
        value: JSON.stringify({
          provider: "soniox",
          channel: 0,
          speaker_index: token.speaker,
        }),
      });
    }
  }

  updateTranscriptWords(store, transcriptId, words);
  updateTranscriptHints(store, transcriptId, hints);
}

export function useCloudRetranscribe(sessionId: string) {
  const auth = useAuth();
  const store = main.UI.useStore(main.STORE_ID);
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const { upload, progress: uploadProgress } = useUploadAudio();

  const [state, setState] = useState<CloudRetranscribeState>({
    phase: "idle",
    error: null,
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startPolling = useCallback(
    (workflowKey: string) => {
      const poll = async () => {
        if (abortedRef.current || !auth.session) {
          cleanup();
          return;
        }

        try {
          const status = await fetchPipelineStatus(
            workflowKey,
            auth.session.access_token,
          );

          if (status.status === "DONE") {
            cleanup();
            removeJob(sessionId);
            if (status.tokens && store) {
              writeTokensToStore(
                store,
                sessionId,
                user_id ?? "",
                status.tokens,
              );
            }
            setState({ phase: "done", error: null });
          } else if (status.status === "ERROR") {
            cleanup();
            removeJob(sessionId);
            setState({
              phase: "error",
              error: status.error ?? "Transcription failed",
            });
          }
        } catch (e) {
          cleanup();
          removeJob(sessionId);
          setState({
            phase: "error",
            error: e instanceof Error ? e.message : "Polling failed",
          });
        }
      };

      pollingRef.current = setInterval(poll, 2000);
    },
    [auth.session, cleanup, sessionId, store, user_id],
  );

  // Resume polling for persisted jobs on mount
  useEffect(() => {
    if (!auth.session) return;

    const existingKey = loadJob(sessionId);
    if (existingKey) {
      setState({ phase: "processing", error: null });
      startPolling(existingKey);
    }
  }, [auth.session, sessionId, startPolling]);

  const run = useCallback(async () => {
    if (!auth.session) {
      setState({ phase: "error", error: "Not authenticated" });
      return;
    }

    abortedRef.current = false;
    setState({ phase: "uploading", error: null });

    try {
      const audioPathResult = await fsSyncCommands.audioPath(sessionId);
      if (audioPathResult.status === "error") {
        throw new Error("Audio file not found");
      }

      const fileId = await upload(audioPathResult.data);

      if (abortedRef.current) return;
      setState({ phase: "processing", error: null });

      const workflowKey = await startPipeline(
        fileId,
        auth.session.access_token,
      );
      saveJob(sessionId, workflowKey);

      if (abortedRef.current) return;
      startPolling(workflowKey);
    } catch (e) {
      if (abortedRef.current) return;
      setState({
        phase: "error",
        error: e instanceof Error ? e.message : "Re-transcription failed",
      });
    }
  }, [auth.session, sessionId, startPolling, upload]);

  const abort = useCallback(() => {
    abortedRef.current = true;
    cleanup();
    removeJob(sessionId);
    setState({ phase: "idle", error: null });
  }, [cleanup, sessionId]);

  return {
    run,
    abort,
    phase: state.phase,
    uploadProgress: state.phase === "uploading" ? uploadProgress : null,
    error: state.error,
    isRunning: state.phase === "uploading" || state.phase === "processing",
  };
}
