import type { Note } from "../types";

export const fetchNote = async (id: string): Promise<Note> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    id,
    title: "주간 회의 - 제품 로드맵 논의",
    rawMemo: "기존 노트 내용입니다...",
    rawTranscript: "회의 전사 내용입니다...",
    calendarEvent: {
      kind: "calendar#event",
      id: "meeting-123",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/...",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      summary: "주간 회의 - 제품 로드맵 논의",
      creator: {
        email: "user@example.com",
        self: true,
      },
      organizer: {
        email: "user@example.com",
        self: true,
      },
      start: {
        dateTime: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        timeZone: "Asia/Seoul",
      },
      end: {
        dateTime: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
        timeZone: "Asia/Seoul",
      },
      hangoutLink: "https://meet.google.com/mock-meeting",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const enhanceNoteWithAI = async (
  title: string,
  rawMemo: string,
  _processedTranscript: Array<any>,
): Promise<{ content: string; suggestedTitle: string | null }> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    content:
      rawMemo +
      "\n\n### AI 보강 내용 ###\n" +
      "1. 주요 논의 사항:\n" +
      "   - 신규 기능 개발 계획\n" +
      "   - 일정 관리 방안\n" +
      "   - 다음 주 계획\n\n" +
      "2. 결정된 사항:\n" +
      "   - 개발 우선순위 조정\n" +
      "   - 주간 회의 시간 변경\n",
    suggestedTitle: title
      ? null
      : "제품 개발 전략 회의 - 우선순위 및 일정 조정",
  };
};

export const sendChatMessage = async (
  message: string,
  transcript: string,
): Promise<{ text: string }> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // TODO: Replace with actual API call
  return {
    text: `AI 응답: "${message}"에 대한 답변입니다. 트랜스크립트 길이: ${transcript.length}자`,
  };
};
