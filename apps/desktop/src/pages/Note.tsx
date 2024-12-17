import { useEffect } from "react";
import { useParams } from "react-router";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import SidePanel from "../components/note/SidePanel";
import NoteHeader from "../components/note/NoteHeader";
import NoteEditor from "../components/note/NoteEditor";

import { useUI } from "../contexts/UIContext";
import { useNoteState } from "../hooks/useNoteState";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

export default function Note() {
  const { id } = useParams();
  const { isPanelOpen } = useUI();
  const {
    state,
    updateState,
    shouldStartRecording,
    updateRecordingTime,
    handlePauseResume,
    handlehyprcharge,
  } = useNoteState(id);
  const {
    isRecording,
    isPaused,
    transcript,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useSpeechRecognition();

  const handlePauseResumeClick = () => {
    handlePauseResume(isPaused, resumeRecording, pauseRecording);
  };

  useEffect(() => {
    if (
      state.isNew ||
      (state.note?.calendarEvent &&
        shouldStartRecording(state.note.calendarEvent))
    ) {
      startRecording();
    }

    const timer = setInterval(() => {
      if (isRecording && !isPaused) {
        updateRecordingTime();
      }
    }, 1000);

    return () => {
      void stopRecording();
      clearInterval(timer);
    };
  }, [
    state.isNew,
    state.note,
    isRecording,
    isPaused,
    startRecording,
    stopRecording,
    updateRecordingTime,
  ]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <main className="flex-1">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={100} minSize={50}>
            <div className="flex h-full flex-col overflow-hidden">
              <NoteHeader
                note={state.note}
                noteTitle={state.title}
                showhyprcharge={state.showhyprcharge}
                isRecording={isRecording}
                isPaused={isPaused}
                recordingTime={state.recordingTime}
                onTitleChange={(title) => updateState({ title })}
                onhyprcharge={handlehyprcharge}
                onStartRecording={startRecording}
                onPauseResume={handlePauseResumeClick}
              />

              <NoteEditor
                content={state.content}
                onChange={(content) => updateState({ content })}
              />
            </div>
          </Panel>

          {isPanelOpen && (
            <>
              <PanelResizeHandle />
              <Panel defaultSize={30} minSize={30} maxSize={50}>
                <SidePanel transcript={transcript} />
              </Panel>
            </>
          )}
        </PanelGroup>
      </main>
    </div>
  );
}
