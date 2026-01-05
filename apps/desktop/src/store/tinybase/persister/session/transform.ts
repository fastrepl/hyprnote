import type {
  MappingSessionParticipantStorage,
  SpeakerHintStorage,
  TranscriptStorage,
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

export type TranscriptWithData = TranscriptStorage & {
  id: string;
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
