import type { Event, Session } from "@hypr/plugin-db";

export const mockSessions: Session[] = [
  {
    id: "session-1",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    visited_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000).toISOString(),
    user_id: "user-123",
    calendar_event_id: "event-456",
    title: "Weekly Team Standup",
    audio_local_path: "/recordings/session-1.mp3",
    audio_remote_path: "https://storage.hyprnote.com/user-123/recordings/session-1.mp3",
    raw_memo_html: "<p>Discussed project timeline updates and resource allocation.</p>",
    enhanced_memo_html:
      "<h2>Weekly Team Standup</h2><p>Discussed project timeline updates and resource allocation for the Q2 product release. The team reviewed current progress and identified several critical areas that need attention before the upcoming deadline.</p><h3>Project Status:</h3><ul><li>Frontend milestones delayed by 2 days due to unexpected API integration challenges</li><li>Backend development remains on track with database migration 85% complete</li><li>Need to onboard new designer by next week to support UI refinement phase</li><li>QA team has reported 12 critical bugs that need immediate attention</li></ul><h3>Resource Allocation:</h3><table border=\"1\"><tr><th>Team</th><th>Current Load</th><th>Adjustment Needed</th></tr><tr><td>Frontend</td><td>Overallocated</td><td>+2 developers</td></tr><tr><td>Backend</td><td>Optimal</td><td>No change</td></tr><tr><td>Design</td><td>Underallocated</td><td>+1 designer</td></tr><tr><td>QA</td><td>Optimal</td><td>No change</td></tr></table><h3>Action Items:</h3><ol><li>Sarah to coordinate with HR on expediting designer hiring process</li><li>Michael to reprioritize frontend tasks to address critical path items first</li><li>Team to conduct daily 15-minute check-ins for the next week</li><li>David to prepare contingency plan for potential deadline extension</li><li>All members to update task status in project management system by EOD</li></ol><p>Next standup scheduled for Friday, 10:00 AM. Please come prepared with updated progress reports.</p>",
    conversations: [],
  },
  {
    id: "session-2",
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    visited_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    user_id: "user-123",
    calendar_event_id: null,
    title: "Product Strategy Brainstorm",
    audio_local_path: "/recordings/session-2.mp3",
    audio_remote_path: null,
    raw_memo_html: "<p>Brainstormed new feature ideas for Q3.</p>",
    enhanced_memo_html:
      "<h2>Product Strategy Brainstorm</h2><p>Conducted a comprehensive brainstorming session with the product and engineering teams to identify potential feature enhancements for Q3 release. The session focused on addressing user feedback from the last three months and competitive analysis.</p><h3>Key User Pain Points:</h3><ul><li>Note organization becomes difficult with large volumes</li><li>Meeting context is often lost between scheduling and attendance</li><li>Manual transcription is time-consuming and error-prone</li><li>Finding specific information across multiple notes is challenging</li><li>Sharing and collaboration workflows are cumbersome</li></ul><h3>Proposed Features:</h3><ol><li><strong>Voice memo transcription</strong><ul><li>Automatic conversion of audio to text</li><li>Speaker identification for multi-person recordings</li><li>Noise cancellation for better quality</li><li>Searchable transcript with timestamps</li><li>Estimated development time: 4-6 weeks</li></ul></li><li><strong>Calendar integration</strong><ul><li>Two-way sync with Google and Outlook calendars</li><li>Automatic note creation for scheduled meetings</li><li>Pre-meeting agenda templates</li><li>Post-meeting action item tracking</li><li>Estimated development time: 3-5 weeks</li></ul></li><li><strong>AI summary generation</strong><ul><li>Automatic key point extraction</li><li>Customizable summary length</li><li>Action item identification</li><li>Follow-up suggestion generation</li><li>Estimated development time: 5-7 weeks</li></ul></li><li><strong>Advanced search capabilities</strong><ul><li>Full-text search across all notes</li><li>Semantic search for concept matching</li><li>Filters for date, participants, and tags</li><li>Saved search functionality</li><li>Estimated development time: 2-3 weeks</li></ul></li></ol><h3>Prioritization Matrix:</h3><table border=\"1\"><tr><th>Feature</th><th>User Impact</th><th>Development Effort</th><th>Business Value</th><th>Priority</th></tr><tr><td>Voice Transcription</td><td>High</td><td>High</td><td>High</td><td>1</td></tr><tr><td>Calendar Integration</td><td>Medium</td><td>Medium</td><td>High</td><td>2</td></tr><tr><td>AI Summary</td><td>High</td><td>High</td><td>Medium</td><td>3</td></tr><tr><td>Advanced Search</td><td>Medium</td><td>Low</td><td>Medium</td><td>4</td></tr></table><p>The team agreed to focus on voice transcription and calendar integration for the initial Q3 release, with AI summary and advanced search planned for a follow-up release later in the quarter.</p><h3>Next Steps:</h3><ul><li>Product team to create detailed specifications by June 15</li><li>Design team to prepare mockups by June 22</li><li>Engineering estimation session scheduled for June 25</li><li>Q3 roadmap presentation to leadership on June 30</li></ul>",
    conversations: [],
  },
];

export const mockEvents: Event[] = [
  {
    id: "event-future-1",
    user_id: "user-123",
    tracking_id: "track-123",
    calendar_id: "cal-123",
    name: "Quarterly Planning Meeting",
    note: "Prepare Q3 roadmap discussion points",
    start_date: new Date(Date.now() + 86400000).toISOString(),
    end_date: new Date(Date.now() + 86400000 + 3600000).toISOString(),
    google_event_url: "https://calendar.google.com/event?id=abc123",
  },
  {
    id: "event-future-2",
    user_id: "user-123",
    tracking_id: "track-456",
    calendar_id: "cal-123",
    name: "Product Demo with Sales Team",
    note: "Show latest feature updates",
    start_date: new Date(Date.now() + 172800000).toISOString(),
    end_date: new Date(Date.now() + 172800000 + 5400000).toISOString(),
    google_event_url: "https://calendar.google.com/event?id=def456",
  },
];
