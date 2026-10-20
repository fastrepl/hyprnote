import type WaveSurfer from "wavesurfer.js";

import { commands as fsSyncCommands } from "@anlg/plugin-fs-sync";

export interface WaveformPeaks {
  duration: number;
  channels: number[][];
}

const pendingPeaks = new Map<string, Promise<WaveformPeaks | null>>();

async function requestSessionPeaks(
  sessionId: string,
): Promise<WaveformPeaks | null> {
  try {
    const result = await fsSyncCommands.audioPeaks(sessionId);
    return result.status === "ok" ? result.data : null;
  } catch {
    return null;
  } finally {
    pendingPeaks.delete(sessionId);
  }
}

export function loadSessionPeaks(
  sessionId: string,
): Promise<WaveformPeaks | null> {
  let request = pendingPeaks.get(sessionId);
  if (!request) {
    request = requestSessionPeaks(sessionId);
    pendingPeaks.set(sessionId, request);
  }
  return request;
}

// Warms the native peak cache without joining `pendingPeaks`: a recording that
// resumes mid-computation must not hand its outdated peaks to a later open.
export async function prepareSessionPeaks(sessionId: string): Promise<void> {
  try {
    await fsSyncCommands.audioPeaks(sessionId);
  } catch {}
}

export function isUsablePeaks(
  peaks: WaveformPeaks | null,
): peaks is WaveformPeaks {
  return (
    peaks !== null &&
    Number.isFinite(peaks.duration) &&
    peaks.duration > 0 &&
    (peaks.channels[0]?.length ?? 0) > 0
  );
}

const AUDIO_TYPES_BY_EXTENSION: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  webm: "audio/webm",
  flac: "audio/flac",
};

// Tauri's asset protocol sniffs content types, and headerless MP3 recordings
// come back as text/html. WebKitGTK cannot stream asset:// URLs either, so
// relabel the blob from the file extension before giving up on it.
function playableBlob(
  media: Pick<HTMLMediaElement, "canPlayType">,
  blob: Blob,
  url: string,
): Blob | null {
  if (media.canPlayType(blob.type)) {
    return blob;
  }

  const extension = decodeURIComponent(url)
    .split(/[?#]/)[0]
    .split(".")
    .pop()
    ?.toLowerCase();
  const type = extension ? AUDIO_TYPES_BY_EXTENSION[extension] : undefined;
  return type && media.canPlayType(type) ? new Blob([blob], { type }) : null;
}

// Playback must not wait for native peaks, which can take seconds on long
// uncached recordings; `load` with the same src only renders the waveform.
export async function loadWaveform(
  ws: Pick<WaveSurfer, "load" | "getMediaElement">,
  {
    url,
    sessionId,
    signal,
    fetchAudio = fetch,
    loadPeaks = loadSessionPeaks,
  }: {
    url: string;
    sessionId: string;
    signal: AbortSignal;
    fetchAudio?: typeof fetch;
    loadPeaks?: (sessionId: string) => Promise<WaveformPeaks | null>;
  },
): Promise<void> {
  const peaksRequest = loadPeaks(sessionId);

  const response = await fetchAudio(url, { signal });
  if (response.status >= 400) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const blob = await response.blob();
  if (signal.aborted) {
    return;
  }

  const media = ws.getMediaElement();
  const playable = playableBlob(media, blob, url);
  const src = playable ? URL.createObjectURL(playable) : url;
  media.src = src;

  const peaks = await peaksRequest;
  if (signal.aborted) {
    return;
  }

  if (isUsablePeaks(peaks)) {
    await ws.load(src, peaks.channels, peaks.duration);
    return;
  }

  await ws.load(src);
}
