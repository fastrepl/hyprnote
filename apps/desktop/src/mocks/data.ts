import type { Note, CalendarEvent } from "../types";

// Helper function to create dates relative to today
const today = new Date("2024-12-14T00:00:00Z");
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(date.getDate() + days);
  return result;
};

const formatDate = (date: Date) => date.toISOString();

export const mockNotes: Note[] = [
  {
    id: "1",
    title: "2024 연말 회고 준비",
    rawMemo:
      "1. 올해 주요 성과\n2. 내년 목표 설정\n3. 팀원 피드백 정리\n4. 개인 성장 포인트",
    calendarEvent: {
      kind: "calendar#event",
      id: "1",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?id=1",
      created: formatDate(addDays(today, -4)), // 4일 전
      updated: formatDate(addDays(today, -4)),
      summary: "2024 연말 회고 준비",
      creator: {
        email: "user@example.com",
        displayName: "User Name",
      },
      organizer: {
        email: "user@example.com",
        displayName: "User Name",
      },
      start: {
        dateTime: formatDate(addDays(today, 5)), // 5일 후
      },
      end: {
        dateTime: formatDate(addDays(today, 5)),
      },
    },
    tags: ["회고", "2024", "성과"],
    createdAt: formatDate(addDays(today, -4)),
    updatedAt: formatDate(addDays(today, -4)),
  },
  {
    id: "2",
    title: "크리스마스 파티 계획",
    rawMemo:
      "장소: 강남 파티룸\n예산: 인당 5만원\n필요한 것:\n- 케이크 주문\n- 선물 교환\n- 음식 케이터링",
    calendarEvent: {
      kind: "calendar#event",
      id: "2",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?id=2",
      created: formatDate(addDays(today, -3)), // 3일 전
      updated: formatDate(addDays(today, -3)),
      summary: "팀 크리스마스 파티",
      creator: {
        email: "user@example.com",
        displayName: "User Name",
      },
      organizer: {
        email: "user@example.com",
        displayName: "User Name",
      },
      start: {
        dateTime: formatDate(addDays(today, 11)), // 11일 후 (크리스마스)
      },
      end: {
        dateTime: formatDate(addDays(today, 11)),
      },
      location: "강남 파티룸",
    },
    tags: ["파티", "크리스마스", "팀빌딩"],
    createdAt: formatDate(addDays(today, -3)),
    updatedAt: formatDate(addDays(today, -3)),
  },
  {
    id: "3",
    title: "개인 독서 노트 - 애자일 조직",
    rawMemo:
      "주요 인사이트:\n1. 작은 실험의 중요성\n2. 피드백 루프 최소화\n3. 팀 자율성과 책임",
    tags: ["독서", "애자일", "조직문화"],
    createdAt: formatDate(addDays(today, -2)),
    updatedAt: formatDate(addDays(today, -2)),
  },
  {
    id: "4",
    title: "2025 Q1 제품 전략 미팅",
    rawMemo:
      "핵심 논의사항:\n- AI 기능 고도화\n- 사용자 피드백 반영\n- 성능 개선 로드맵",
    calendarEvent: {
      kind: "calendar#event",
      id: "4",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?id=4",
      created: formatDate(addDays(today, -2)),
      updated: formatDate(addDays(today, -2)),
      summary: "2025 Q1 제품 전략 미팅",
      creator: {
        email: "user@example.com",
        displayName: "User Name",
      },
      organizer: {
        email: "user@example.com",
        displayName: "User Name",
      },
      start: {
        dateTime: formatDate(addDays(today, 2)),
      },
      end: {
        dateTime: formatDate(addDays(today, 2)),
      },
    },
    tags: ["전략", "제품", "2025"],
    createdAt: formatDate(addDays(today, -2)),
    updatedAt: formatDate(addDays(today, -2)),
  },
  {
    id: "5",
    title: "프로젝트 회고 - 모바일 앱 런칭",
    rawMemo:
      "성공 요인:\n1. 철저한 사용자 테스트\n2. 빠른 이터레이션\n\n개선 필요:\n1. 커뮤니케이션 프로세스\n2. 기술 부채 관리",
    tags: ["회고", "프로젝트", "모바일"],
    createdAt: formatDate(addDays(today, -1)),
    updatedAt: formatDate(addDays(today, -1)),
  },
  {
    id: "6",
    title: "신규 입사자 온보딩 계획",
    rawMemo:
      "1주차: 팀 소개 및 제품 교육\n2주차: 개발 환경 셋업\n3주차: 작은 과제로 시작\n4주차: 실제 프로젝트 참여",
    calendarEvent: {
      kind: "calendar#event",
      id: "6",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?id=6",
      created: formatDate(addDays(today, -1)),
      updated: formatDate(addDays(today, -1)),
      summary: "신규 입사자 온보딩 미팅",
      creator: {
        email: "user@example.com",
        displayName: "User Name",
      },
      organizer: {
        email: "user@example.com",
        displayName: "User Name",
      },
      start: {
        dateTime: formatDate(addDays(today, 4)),
      },
      end: {
        dateTime: formatDate(addDays(today, 4)),
      },
    },
    tags: ["온보딩", "HR", "교육"],
    createdAt: formatDate(addDays(today, -1)),
    updatedAt: formatDate(addDays(today, -1)),
  },
  {
    id: "7",
    title: "기술 부채 해결 계획",
    rawMemo:
      "우선순위:\n1. 테스트 커버리지 개선\n2. 레거시 코드 리팩토링\n3. 문서화 업데이트",
    tags: ["개발", "기술부채", "계획"],
    createdAt: formatDate(today),
    updatedAt: formatDate(today),
  },
];

export const mockEvents: CalendarEvent[] = [
  {
    kind: "calendar#event",
    id: "1",
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event?id=1",
    created: formatDate(addDays(today, -4)),
    updated: formatDate(addDays(today, -4)),
    summary: "2024 연말 회고 준비",
    creator: {
      email: "user@example.com",
      displayName: "User Name",
    },
    organizer: {
      email: "user@example.com",
      displayName: "User Name",
    },
    start: {
      dateTime: formatDate(addDays(today, 5)),
    },
    end: {
      dateTime: formatDate(addDays(today, 5)),
    },
  },
  {
    kind: "calendar#event",
    id: "2",
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event?id=2",
    created: formatDate(addDays(today, -3)),
    updated: formatDate(addDays(today, -3)),
    summary: "팀 크리스마스 파티",
    creator: {
      email: "user@example.com",
      displayName: "User Name",
    },
    organizer: {
      email: "user@example.com",
      displayName: "User Name",
    },
    start: {
      dateTime: formatDate(addDays(today, 11)),
    },
    end: {
      dateTime: formatDate(addDays(today, 11)),
    },
    location: "강남 파티룸",
  },
  {
    kind: "calendar#event",
    id: "3",
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event?id=3",
    created: formatDate(addDays(today, -2)),
    updated: formatDate(addDays(today, -2)),
    summary: "주간 팀 미팅",
    creator: {
      email: "user@example.com",
      displayName: "User Name",
    },
    organizer: {
      email: "user@example.com",
      displayName: "User Name",
    },
    start: {
      dateTime: formatDate(today),
    },
    end: {
      dateTime: formatDate(today),
    },
  },
  {
    kind: "calendar#event",
    id: "4",
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event?id=4",
    created: formatDate(addDays(today, -2)),
    updated: formatDate(addDays(today, -2)),
    summary: "2025 Q1 제품 전략 미팅",
    creator: {
      email: "user@example.com",
      displayName: "User Name",
    },
    organizer: {
      email: "user@example.com",
      displayName: "User Name",
    },
    start: {
      dateTime: formatDate(addDays(today, 2)),
    },
    end: {
      dateTime: formatDate(addDays(today, 2)),
    },
  },
  {
    kind: "calendar#event",
    id: "5",
    status: "tentative",
    htmlLink: "https://calendar.google.com/event?id=5",
    created: formatDate(addDays(today, -2)),
    updated: formatDate(addDays(today, -2)),
    summary: "외부 투자자 미팅",
    creator: {
      email: "user@example.com",
      displayName: "User Name",
    },
    organizer: {
      email: "user@example.com",
      displayName: "User Name",
    },
    start: {
      dateTime: formatDate(addDays(today, 1)),
    },
    end: {
      dateTime: formatDate(addDays(today, 1)),
    },
    location: "강남 스타트업 허브",
  },
  {
    kind: "calendar#event",
    id: "6",
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event?id=6",
    created: formatDate(addDays(today, -1)),
    updated: formatDate(addDays(today, -1)),
    summary: "신규 입사자 온보딩 미팅",
    creator: {
      email: "user@example.com",
      displayName: "User Name",
    },
    organizer: {
      email: "user@example.com",
      displayName: "User Name",
    },
    start: {
      dateTime: formatDate(addDays(today, 4)),
    },
    end: {
      dateTime: formatDate(addDays(today, 4)),
    },
  },
  {
    kind: "calendar#event",
    id: "7",
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event?id=7",
    created: formatDate(today),
    updated: formatDate(today),
    summary: "연말 결산 보고",
    creator: {
      email: "user@example.com",
      displayName: "User Name",
    },
    organizer: {
      email: "user@example.com",
      displayName: "User Name",
    },
    start: {
      dateTime: formatDate(addDays(today, 6)),
    },
    end: {
      dateTime: formatDate(addDays(today, 6)),
    },
  },
  {
    kind: "calendar#event",
    id: "8",
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event?id=8",
    created: formatDate(addDays(today, -3)),
    updated: formatDate(addDays(today, -3)),
    summary: "프로젝트 데모 리허설",
    creator: {
      email: "user@example.com",
      displayName: "User Name",
    },
    organizer: {
      email: "user@example.com",
      displayName: "User Name",
    },
    start: {
      dateTime: formatDate(addDays(today, -1)),
    },
    end: {
      dateTime: formatDate(addDays(today, -1)),
    },
  },
];

export const mockPhrases = [
  "안녕하세요, 오늘 회의를 시작하겠습니다.",
  "첫 번째 안건은 신규 기능 개발에 관한 것입니다.",
  "다음 주제로 넘어가도록 하겠습니다.",
  "이 부분에 대해 의견 있으신 분 말씀해 주세요.",
  "회의 마무리하도록 하겠습니다.",
];
