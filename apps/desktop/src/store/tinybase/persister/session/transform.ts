import type {
  MappingSessionParticipantStorage,
  SpeakerHintStorage,
  WordStorage,
} from "@hypr/store";

export type ParticipantData = MappingSessionParticipantStorage & { id: string };

export type SessionMetaJson = {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  event_id?: string;
  participants: ParticipantData[];
  tags?: string[];
};

export type TranscriptWithData = {
  id: string;
  user_id: string;
  created_at: string;
  session_id: string;
  started_at: number;
  ended_at?: number;
  words: Array<WordStorage & { id: string }>;
  speaker_hints: Array<SpeakerHintStorage & { id: string }>;
};

export type TranscriptJson = {
  transcripts: TranscriptWithData[];
};

export type NoteFrontmatter = {
  id: string;
  session_id: string;
  type: "enhanced_note" | "memo";
  template_id?: string;
  position?: number;
  title?: string;
};
