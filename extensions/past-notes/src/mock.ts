import { type Session } from "@hypr/plugin-db";

export const mockPastNotes: Session[] = [
  {
    id: "note1",
    user_id: "user123",
    timestamp: "2025-03-04T04:15:00Z",
    calendar_event_id: "event1",
    title: "Weekly Team Sync",
    audio_local_path: "/recordings/team-sync-mar4.mp3",
    audio_remote_path:
      "https://storage.example.com/recordings/team-sync-mar4.mp3",
    raw_memo_html:
      "<p>Discussed project timeline and upcoming deliverables</p><p>Team velocity is good</p>",
    enhanced_memo_html:
      "<h3>Weekly Team Sync Summary</h3><p>• Discussed project timeline and upcoming deliverables</p><p>• Team velocity is trending positively</p><p>• Next steps defined for Q2</p>",
    conversations: [],
  },
  {
    id: "note2",
    user_id: "user123",
    timestamp: "2025-03-03T09:30:00Z",
    calendar_event_id: null,
    title: "Product Design Review",
    audio_local_path: null,
    audio_remote_path: null,
    raw_memo_html: "<p>New feature mockups review. UI improvements needed.</p>",
    enhanced_memo_html: null,
    conversations: [],
  },
  {
    id: "note3",
    user_id: "user123",
    timestamp: "2025-03-02T15:45:00Z",
    calendar_event_id: "event3",
    title: "Client Meeting - ABC Corp",
    audio_local_path: "/recordings/client-abc-mar2.mp3",
    audio_remote_path:
      "https://storage.example.com/recordings/client-abc-mar2.mp3",
    raw_memo_html:
      "<p>Requirements gathering for phase 2</p><p>Budget approved</p>",
    enhanced_memo_html:
      "<h3>Client Meeting Notes</h3><p>• Phase 2 requirements discussed in detail</p><p>• Budget approval received for Q2</p><p>• Technical specifications to be finalized by next week</p>",
    conversations: [],
  },
];
