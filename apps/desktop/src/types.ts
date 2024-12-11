import type { Node as PMNode } from "@tiptap/pm/model";

// Google Calendar Event Type
export interface CalendarEvent {
  kind: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description?: string;
  location?: string;
  creator: {
    id?: string;
    email: string;
    displayName?: string;
    self?: boolean;
  };
  organizer: {
    id?: string;
    email: string;
    displayName?: string;
    self?: boolean;
  };
  start: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    id?: string;
    email: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
    responseStatus?: string;
  }>;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
      label?: string;
      pin?: string;
      accessCode?: string;
      meetingCode?: string;
    }>;
    conferenceId?: string;
  };
}

export interface Note {
  id: string;
  title: string;
  calendarEvent?: CalendarEvent;
  rawMemo: string;
  hyperChargedMemo?: PMNode;
  voiceRecording?: string;
  rawTranscript?: string;
  processedTranscript?: Transcript;
  tags?: string[];
  createdAt: string;
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
