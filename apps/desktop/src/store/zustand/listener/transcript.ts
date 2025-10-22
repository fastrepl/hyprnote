import type { StoreApi } from "zustand";

export type TranscriptState = {};

export type TranscriptActions = {};

export const createTranscriptSlice = <T extends TranscriptState>(
  _set: StoreApi<T>["setState"],
  _get: StoreApi<T>["getState"],
): TranscriptState & TranscriptActions => ({});
