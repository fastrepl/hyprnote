import type { Node as PMNode } from "@tiptap/pm/model";

// Google Calendar Event Type
export interface CalendarEvent {
  // 이벤트의 종류를 나타내는 식별자 (항상 "calendar#event")
  kind: "calendar#event";
  // 리소스의 ETag
  etag?: string;
  // 이벤트의 고유 식별자
  id: string;
  // 이벤트의 상태 (confirmed: 확정, tentative: 임시, cancelled: 취소)
  status: "confirmed" | "tentative" | "cancelled";
  // Google Calendar 웹 UI에서 이벤트로 연결되는 절대 링크
  htmlLink: string;
  // 이벤트 생성 시간 (RFC3339 타임스탬프)
  created: string;
  // 이벤트 마지막 수정 시간 (RFC3339 타임스탬프)
  updated: string;
  // 이벤트 제목
  summary: string;
  // 이벤트 설명 (HTML 포함 가능)
  description?: string;
  // 이벤트 위치 (자유 형식 텍스트)
  location?: string;
  // 이벤트 색상 ID (colors 엔드포인트의 이벤트 섹션 참조)
  colorId?: string;
  // 이벤트 생성자 정보
  creator: {
    id?: string; // 생성자의 Profile ID
    email: string; // 생성자의 이메일
    displayName?: string; // 생성자의 표시 이름
    self?: boolean; // 생성자가 현재 캘린더의 소유자인지 여부
  };
  // 이벤트 주최자 정보
  organizer: {
    id?: string; // 주최자의 Profile ID
    email: string; // 주최자의 이메일
    displayName?: string; // 주최자의 표시 이름
    self?: boolean; // 주최자가 현재 캘린더의 소유자인지 여부
  };
  // 이벤트 시작 시간 정보
  start: {
    date?: string; // 종일 이벤트인 경우 날짜 ("yyyy-mm-dd" 형식)
    dateTime?: string; // 시간이 있는 이벤트의 경우 날짜와 시간 (RFC3339 형식)
    timeZone?: string; // 시간대 (IANA Time Zone Database 이름 형식)
  };
  // 이벤트 종료 시간 정보
  end: {
    date?: string; // 종일 이벤트인 경우 날짜
    dateTime?: string; // 시간이 있는 이벤트의 경우 날짜와 시간
    timeZone?: string; // 시간대
  };
  // 종료 시간이 미지정인지 여부
  endTimeUnspecified?: boolean;
  // 반복 일정 규칙 (RFC5545 형식의 RRULE, EXRULE, RDATE, EXDATE)
  recurrence?: string[];
  // 반복 이벤트의 ID (반복 이벤트의 인스턴스인 경우)
  recurringEventId?: string;
  // 원래 시작 시간 (반복 이벤트가 이동된 경우)
  originalStartTime?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  // 일정 표시 방식 (opaque: 바쁨, transparent: 한가함)
  transparency?: "opaque" | "transparent";
  // 이벤트 공개 범위 (default: 기본값, public: 공개, private: 비공개, confidential: 기밀)
  visibility?: "default" | "public" | "private" | "confidential";
  // iCalendar 고유 식별자 (RFC5545)
  iCalUID?: string;
  // 일정 순서 번호 (iCalendar 기준)
  sequence?: number;
  // 참석자 목록
  attendees?: Array<{
    id?: string; // 참석자의 Profile ID
    email: string; // 참석자의 이메일
    displayName?: string; // 참석자의 표시 이름
    organizer?: boolean; // 참석자가 주최자인지 여부
    self?: boolean; // 참석자가 현재 캘린더의 소유자인지 여부
    resource?: boolean; // 참석자가 자원(예: 회의실)인지 여부
    optional?: boolean; // 선택적 참석자인지 여부
    responseStatus?: string; // 참석 응답 상태
    comment?: string; // 참석자의 코멘트
    additionalGuests?: number; // 추가 게스트 수
  }>;
  // 참석자 목록이 생략되었는지 여부
  attendeesOmitted?: boolean;
  // 확장 속성
  extendedProperties?: {
    private?: { [key: string]: string }; // 개인 속성
    shared?: { [key: string]: string }; // 공유 속성
  };
  // Google Hangout 링크
  hangoutLink?: string;
  // 화상 회의 데이터
  conferenceData?: {
    createRequest?: {
      requestId?: string;
      conferenceSolutionKey?: {
        type?: string;
      };
      status?: {
        statusCode?: string;
      };
    };
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
      label?: string;
      pin?: string;
      accessCode?: string;
      meetingCode?: string;
      passcode?: string;
      password?: string;
    }>;
    conferenceSolution?: {
      key?: {
        type?: string;
      };
      name?: string;
      iconUri?: string;
    };
    conferenceId?: string;
    signature?: string;
    notes?: string;
  };
  // 가젯 정보 (deprecated)
  gadget?: {
    type?: string;
    title?: string;
    link?: string;
    iconLink?: string;
    width?: number;
    height?: number;
    display?: string;
    preferences?: { [key: string]: string };
  };
  // 누구나 자신을 초대할 수 있는지 여부
  anyoneCanAddSelf?: boolean;
  // 게스트가 다른 사람을 초대할 수 있는지 여부
  guestsCanInviteOthers?: boolean;
  // 게스트가 이벤트를 수정할 수 있는지 여부
  guestsCanModify?: boolean;
  // 게스트가 다른 게스트를 볼 수 있는지 여부
  guestsCanSeeOtherGuests?: boolean;
  // 개인 복사본인지 여부
  privateCopy?: boolean;
  // 수정 불가능한 이벤트인지 여부
  locked?: boolean;
  // 알림 설정
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method?: string;
      minutes?: number;
    }>;
  };
  // 이벤트 소스 정보
  source?: {
    url?: string;
    title?: string;
  };
  // 첨부 파일
  attachments?: Array<{
    fileUrl?: string;
    title?: string;
    mimeType?: string;
    iconLink?: string;
    fileId?: string;
  }>;
  // 이벤트 유형 (default: 기본, outOfOffice: 부재중, focusTime: 집중 시간, workingLocation: 근무 위치)
  eventType?: "default" | "outOfOffice" | "focusTime" | "workingLocation";
}

export interface Note {
  id: string;
  title: string;
  calendarEvent?: CalendarEvent;
  rawMemo: string;
  hyprChargedMemo?: PMNode;
  voiceRecording?: string; // path
  rawTranscript?: string;
  processedTranscript?: Transcript;
  tags?: string[];
  createdAt: string; // date
  updatedAt: string;
}

export interface TranscriptBlock {
  timestamp: string;
  text: string;
  speaker: string;
}

export interface Transcript {
  speakers: string[];
  blocks: Array<TranscriptBlock>;
}
