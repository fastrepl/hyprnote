import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import SidePanel from "../components/note/SidePanel";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useUI } from "../contexts/UIContext";
import NoteHeader from "../components/note/NoteHeader";
import NoteEditor from "../components/note/NoteEditor";
import { useNoteState } from "../hooks/useNoteState";

export default function NotePage() {
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
    currentTranscript,
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
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <main className="flex-1">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={100} minSize={50}>
            <div className="flex h-full flex-col overflow-hidden">
              <NoteHeader
                note={state.note}
                isNew={state.isNew}
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
                <SidePanel noteContent={state.content} />
              </Panel>
            </>
          )}
        </PanelGroup>
      </main>
    </div>
  );
}
