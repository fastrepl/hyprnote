import { useEffect } from "react";
import { useParams } from "react-router";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import SidePanel from "../components/note/SidePanel";
import NoteHeader from "../components/note/NoteHeader";
import NoteEditor from "../components/note/NoteEditor";

import { useUI } from "../contexts/UIContext";
import { useNoteState } from "../hooks/useNoteState";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { mockTranscripts } from "../mocks/data";

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

  // 시뮬레이션을 위한 샘플 데이터
  const sampleTimestamps = [
    { time: "09:30", text: "안녕하세요, 오늘 회의를 시작하겠습니다." },
    { time: "09:31", text: "지난 회의에서 논의된 사항들을 먼저 리뷰해보겠습니다." },
    { time: "09:33", text: "첫 번째 안건은 신규 프로젝트 일정 조정입니다." },
    { time: "09:35", text: "두 번째로 리소스 할당에 대해 이야기해보겠습니다." },
    { time: "09:38", text: "마지막으로 다음 주 마일스톤 설정에 대해 논의하겠습니다." }
  ];

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
              <PanelResizeHandle className="w-2 bg-gray-100 hover:bg-gray-200" />
              <Panel defaultSize={20} minSize={15} maxSize={40}>
                <SidePanel transcript={transcript} timestamps={mockTranscripts} />
              </Panel>
            </>
          )}
        </PanelGroup>
      </main>
    </div>
  );
}
