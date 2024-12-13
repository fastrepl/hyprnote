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
  {
    id: "4",
    title: "분기별 성과 리뷰 미팅",
    rawMemo: "Q1 목표 달성도 평가 및 Q2 전략 수립...",
    calendarEvent: {
      kind: "calendar#event",
      id: "4",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?id=4",
      created: "2024-03-25T08:00:00Z",
      updated: "2024-03-25T08:00:00Z",
      summary: "분기별 성과 리뷰 미팅",
      creator: {
        email: "manager@example.com",
        displayName: "Team Manager",
      },
      organizer: {
        email: "manager@example.com",
        displayName: "Team Manager",
      },
      start: {
        dateTime: "2024-03-25T10:00:00Z",
      },
      end: {
        dateTime: "2024-03-25T12:00:00Z",
      },
    },
    voiceRecording: "recording4.mp3",
    tags: ["회의", "성과", "전략"],
    createdAt: "2024-03-25T08:00:00Z",
    updatedAt: "2024-03-25T12:15:00Z",
  },
  {
    id: "5",
    title: "신규 프로젝트 킥오프 미팅",
    rawMemo: "프로젝트 범위, 목표, 일정 및 팀 구성 논의...",
    calendarEvent: {
      kind: "calendar#event",
      id: "5",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?id=5",
      created: "2024-03-26T09:30:00Z",
      updated: "2024-03-26T09:30:00Z",
      summary: "신규 프로젝트 킥오프 미팅",
      creator: {
        email: "pm@example.com",
        displayName: "Project Manager",
      },
      organizer: {
        email: "pm@example.com",
        displayName: "Project Manager",
      },
      start: {
        dateTime: "2024-03-26T13:00:00Z",
      },
      end: {
        dateTime: "2024-03-26T15:00:00Z",
      },
    },
    voiceRecording: "recording5.mp3",
    tags: ["프로젝트", "킥오프", "계획"],
    createdAt: "2024-03-26T09:30:00Z",
    updatedAt: "2024-03-26T15:10:00Z",
  },
  {
    id: "6",
    title: "고객 피드백 분석 세션",
    rawMemo: "최근 수집된 고객 피드백 분석 및 개선 방안 도출...",
    calendarEvent: {
      kind: "calendar#event",
      id: "6",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?id=6",
      created: "2024-03-27T10:00:00Z",
      updated: "2024-03-27T10:00:00Z",
      summary: "고객 피드백 분석 세션",
      creator: {
        email: "product@example.com",
        displayName: "Product Owner",
      },
      organizer: {
        email: "product@example.com",
        displayName: "Product Owner",
      },
      start: {
        dateTime: "2024-03-27T14:00:00Z",
      },
      end: {
        dateTime: "2024-03-27T16:00:00Z",
      },
    },
    voiceRecording: "recording6.mp3",
    tags: ["고객", "피드백", "분석"],
    createdAt: "2024-03-27T10:00:00Z",
    updatedAt: "2024-03-27T16:20:00Z",
  },
  {
    id: "7",
    title: "기술 스택 업그레이드 논의",
    rawMemo: "현재 기술 스택 평가 및 새로운 기술 도입 가능성 검토...",
    calendarEvent: {
      kind: "calendar#event",
      id: "7",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?id=7",
      created: "2024-03-28T08:30:00Z",
      updated: "2024-03-28T08:30:00Z",
      summary: "기술 스택 업그레이드 논의",
      creator: {
        email: "tech_lead@example.com",
        displayName: "Tech Lead",
      },
      organizer: {
        email: "tech_lead@example.com",
        displayName: "Tech Lead",
      },
      start: {
        dateTime: "2024-03-28T11:00:00Z",
      },
      end: {
        dateTime: "2024-03-28T13:00:00Z",
      },
    },
    voiceRecording: "recording7.mp3",
    tags: ["기술", "업그레이드", "개발"],
    createdAt: "2024-03-28T08:30:00Z",
    updatedAt: "2024-03-28T13:15:00Z",
  },
  {
    id: "8",
    title: "팀 빌딩 워크샵",
    rawMemo: "팀 협업 강화 및 의사소통 개선을 위한 활동 진행...",
    calendarEvent: {
      kind: "calendar#event",
      id: "8",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?id=8",
      created: "2024-03-29T09:00:00Z",
      updated: "2024-03-29T09:00:00Z",
      summary: "팀 빌딩 워크샵",
      creator: {
        email: "hr@example.com",
        displayName: "HR Manager",
      },
      organizer: {
        email: "hr@example.com",
        displayName: "HR Manager",
      },
      start: {
        dateTime: "2024-03-29T13:00:00Z",
      },
      end: {
        dateTime: "2024-03-29T17:00:00Z",
      },
    },
    voiceRecording: "recording8.mp3",
    tags: ["팀빌딩", "워크샵", "협업"],
    createdAt: "2024-03-29T09:00:00Z",
    updatedAt: "2024-03-29T17:30:00Z",
  },
];

export const mockPhrases = [
  "안녕하세요, 오늘 회의를 시작하겠습니다.",
  "첫 번째 안건은 신규 기능 개발에 관한 것입니다.",
  "두 번째로 일정 관리에 대해 논의하겠습니다.",
  "마지막으로 다음 주 계획을 정리해보겠습니다.",
  "개발팀에서 제안한 새로운 기술 스택에 대해 의견을 나눠봅시다.",
  "사용자 피드백을 바탕으로 UI/UX 개선 방안을 논의하겠습니다.",
  "프로젝트 진행 상황을 점검하고 필요한 조치를 결정하겠습니다.",
  "팀원들의 업무 분담과 협업 방식에 대해 의견을 나눠주시기 바랍니다.",
  "예산 사용 현황과 향후 계획에 대해 보고 부탁드립니다.",
  "마지막으로 질문이나 추가 의견 있으신 분 말씀해 주세요.",
];
