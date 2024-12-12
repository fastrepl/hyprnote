import type { Note } from "../types";

export const mockNotes: Note[] = [
  {
    id: "1",
    title: "주간 회의 - 제품 로드맵 논의",
    rawMemo: "Q1 목표 달성을 위한 주요 기능 개발 계획 논의...",
    calendarEvent: {
      kind: "calendar#event",
      id: "1",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?id=1",
      created: "2024-03-20T09:00:00Z",
      updated: "2024-03-20T09:00:00Z",
      summary: "주간 회의 - 제품 로드맵 논의",
      creator: {
        email: "user@example.com",
        displayName: "User Name",
      },
      organizer: {
        email: "user@example.com",
        displayName: "User Name",
      },
      start: {
        dateTime: "2024-03-20T14:30:00Z",
      },
      end: {
        dateTime: "2024-03-20T15:30:00Z",
      },
    },
    voiceRecording: "recording1.mp3",
    tags: ["회의", "제품", "개발"],
    createdAt: "2024-03-20T09:00:00Z",
    updatedAt: "2024-03-20T09:32:15Z",
  },
  {
    id: "2",
    title: "팀 스크럼 미팅",
    rawMemo: "스프린트 3 진행상황 점검 및 블로커 이슈 논의...",
    calendarEvent: {
      kind: "calendar#event",
      id: "2",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?id=2",
      created: "2024-03-19T09:00:00Z",
      updated: "2024-03-19T09:00:00Z",
      summary: "팀 스크럼 미팅",
      creator: {
        email: "user@example.com",
        displayName: "User Name",
      },
      organizer: {
        email: "user@example.com",
        displayName: "User Name",
      },
      start: {
        dateTime: "2024-03-19T14:00:00Z",
      },
      end: {
        dateTime: "2024-03-19T14:30:00Z",
      },
    },
    voiceRecording: "recording2.mp3",
    tags: ["회의", "스크럼", "개발"],
    createdAt: "2024-03-19T09:00:00Z",
    updatedAt: "2024-03-19T09:15:45Z",
  },
  {
    id: "3",
    title: "사용자 인터뷰 - 김OO님",
    rawMemo: "신규 기능에 대한 사용자 피드백 및 개선사항...",
    calendarEvent: {
      kind: "calendar#event",
      id: "3",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?id=3",
      created: "2024-03-18T09:00:00Z",
      updated: "2024-03-18T09:00:00Z",
      summary: "사용자 인터뷰 - 김OO님",
      creator: {
        email: "user@example.com",
        displayName: "User Name",
      },
      organizer: {
        email: "user@example.com",
        displayName: "User Name",
      },
      start: {
        dateTime: "2024-03-18T15:00:00Z",
      },
      end: {
        dateTime: "2024-03-18T16:00:00Z",
      },
    },
    voiceRecording: "recording3.mp3",
    tags: ["인터뷰", "사용자", "피드백"],
    createdAt: "2024-03-18T09:00:00Z",
    updatedAt: "2024-03-18T09:45:30Z",
  },
];

export const mockPhrases = [
  "안녕하세요, 오늘 회의를 시작하겠습니다.",
  "첫 번째 안건은 신규 기능 개발에 관한 것입니다.",
  "두 번째로 일정 관리에 대해 논의하겠습니다.",
  "마지막으로 다음 주 계획을 정리해보겠습니다.",
];
