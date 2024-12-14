import { useState, useEffect } from "react";
import { Note, CalendarEvent } from "../types";
import { mockNotes } from "../mocks/data";

interface NoteState {
  isNew: boolean;
  note: Note | null;
  content: string;
  title: string;
  recordingTime: number;
  showhyprcharge: boolean;
}

export function useNoteState(id: string | undefined) {
  const [state, setState] = useState<NoteState>({
    isNew: !id,
    note: null,
    content: "",
    title: "",
    recordingTime: 0,
    showhyprcharge: false,
  });

  const updateState = (updates: Partial<NoteState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (id && !state.isNew) {
      const loadNote = () => {
        try {
          const noteData = mockNotes.find((note) => note.id === id);
          if (noteData) {
            updateState({
              note: noteData,
              title: noteData.title,
              content: noteData.rawMemo,
            });
          } else {
            console.error("Note not found");
          }
        } catch (error) {
          console.error("Failed to load note:", error);
        }
      };
      loadNote();
    }
  }, [id, state.isNew]);

  const shouldStartRecording = (event: CalendarEvent) => {
    const now = new Date();
    const startTime = event.start.dateTime
      ? new Date(event.start.dateTime)
      : event.start.date
        ? new Date(event.start.date)
        : null;

    return startTime ? now >= startTime : false;
  };

  const updateRecordingTime = () => {
    setState((prev) => ({
      ...prev,
      recordingTime: prev.recordingTime + 1,
    }));
  };

  const handlePauseResume = async (
    isPaused: boolean,
    resumeRecording: () => void | Promise<void>,
    pauseRecording: () => void | Promise<void>,
  ) => {
    if (isPaused) {
      await Promise.resolve(resumeRecording());
      updateState({ showhyprcharge: false });
    } else {
      await Promise.resolve(pauseRecording());
      updateState({ showhyprcharge: true });
    }
  };

  const handlehyprcharge = async () => {
    const enhancedNote = {
      content: state.content,
      suggestedTitle: state.title,
    };
    updateState({
      content: enhancedNote.content,
      title:
        !state.title && enhancedNote.suggestedTitle
          ? enhancedNote.suggestedTitle
          : state.title,
    });
  };

  return {
    state,
    updateState,
    shouldStartRecording,
    updateRecordingTime,
    handlePauseResume,
    handlehyprcharge,
  };
}
