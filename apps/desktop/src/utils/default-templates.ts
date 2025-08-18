import type { Template } from "@hypr/plugin-db";

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "default-meeting-notes",
    user_id: "system",
    title: "📝 General Meeting",
    description:
      "Capture attendee names and meeting purpose, list agenda items covered, document key discussion points and decisions, assign specific action items with owners and deadlines.",
    sections: [
      { title: "Meeting Details", description: "Date, time, attendees, and meeting purpose" },
      { title: "Agenda", description: "Topics to be discussed and objectives" },
      { title: "Discussion Points", description: "Key points, decisions, and insights from the meeting" },
      { title: "Action Items", description: "Tasks assigned with owners and deadlines" },
      { title: "Next Steps", description: "Follow-up actions and next meeting details" },
    ],
    tags: ["general", "meeting", "agenda", "action-items", "builtin"],
  },
  {
    id: "default-standup",
    user_id: "system",
    title: "🌞 Daily Standup",
    description:
      "List yesterday's completed tasks, specify today's work priorities, identify blockers with potential solutions, and note sprint goals and important updates.",
    sections: [
      { title: "Yesterday", description: "What was accomplished yesterday" },
      { title: "Today", description: "What will be worked on today" },
      { title: "Blockers", description: "Any impediments or issues that need attention" },
      { title: "Goals", description: "Key objectives for the day/sprint" },
      { title: "Notes", description: "Additional updates or important information" },
    ],
    tags: ["general", "standup", "daily", "progress", "blockers", "builtin"],
  },
  {
    id: "default-weekly-review",
    user_id: "system",
    title: "📅 Weekly Review",
    description:
      "Document specific achievements with metrics, describe challenges and solutions used, extract key lessons learned, set measurable goals for next week, and identify improvement areas.",
    sections: [
      { title: "Achievements", description: "What was accomplished this week" },
      { title: "Challenges", description: "Obstacles faced and how they were handled" },
      { title: "Lessons Learned", description: "Key insights and takeaways" },
      { title: "Next Week Goals", description: "Priorities and objectives for next week" },
      { title: "Improvements", description: "Areas for personal or process improvement" },
    ],
    tags: ["general", "weekly", "review", "reflection", "planning", "builtin"],
  },
  {
    id: "default-one-on-one",
    user_id: "system",
    title: "👥 1-on-1 Meeting",
    description:
      "Record emotional check-ins and overall well-being, update on recent work progress, identify specific challenges and blockers, discuss career development opportunities and team feedback, then list concrete action items.",
    sections: [
      { title: "Check-in", description: "How are things going overall?" },
      { title: "Recent Work", description: "Updates on current projects and tasks" },
      { title: "Challenges", description: "Any blockers or difficulties" },
      { title: "Career Development", description: "Growth opportunities and feedback" },
      { title: "Team Feedback", description: "Thoughts on team dynamics and processes" },
      { title: "Action Items", description: "Follow-up tasks and commitments" },
    ],
    tags: ["general", "one-on-one", "1-on-1", "management", "feedback", "builtin"],
  },
  {
    id: "default-user-interview",
    user_id: "system",
    title: "👤 User Interview",
    description:
      "Note participant background and role, define research goals clearly, document current user behavior workflows, capture exact quotes about pain points, record feature reactions, and synthesize key insights.",
    sections: [
      { title: "Participant Info", description: "Name, role, and background details" },
      { title: "Research Goals", description: "What we want to learn from this session" },
      { title: "User Behavior", description: "How they currently solve the problem" },
      { title: "Pain Points", description: "Frustrations and challenges they face" },
      { title: "Feature Feedback", description: "Reactions to proposed solutions" },
      { title: "Key Insights", description: "Important learnings and next steps" },
    ],
    tags: ["startup", "user-interview", "research", "feedback", "ux", "builtin"],
  },
  {
    id: "default-b2b-discovery",
    user_id: "system",
    title: "🔍 B2B Customer: Discovery",
    description:
      "Document company size and industry context, identify specific business challenges with cost impact, note existing solutions and limitations, map decision-making process and stakeholders, list requirements and success criteria.",
    sections: [
      { title: "Company Background", description: "Organization size, industry, and context" },
      { title: "Current Challenges", description: "Problems they are trying to solve" },
      { title: "Existing Solutions", description: "What they use now and limitations" },
      { title: "Decision Process", description: "How decisions are made and key stakeholders" },
      { title: "Requirements", description: "Must-have features and success criteria" },
      { title: "Next Steps", description: "Follow-up actions and timeline" },
    ],
    tags: ["startup", "b2b", "discovery", "sales", "customer", "builtin"],
  },
  {
    id: "default-b2b-pilot",
    user_id: "system",
    title: "🚀 B2B Customer: Pilot",
    description:
      "Define pilot scope and success metrics, track progress against milestones, capture user feedback and adoption patterns, document challenges and solutions, quantify value delivered with ROI, plan next phase expansion.",
    sections: [
      { title: "Pilot Overview", description: "Goals, scope, and success metrics" },
      { title: "Progress Update", description: "Current status and milestones achieved" },
      { title: "User Feedback", description: "How the team is using the solution" },
      { title: "Challenges", description: "Issues encountered and resolution status" },
      { title: "Value Delivered", description: "Benefits and ROI demonstrated" },
      { title: "Next Phase", description: "Plans for expansion or full deployment" },
    ],
    tags: ["startup", "b2b", "pilot", "customer", "progress", "builtin"],
  },
  {
    id: "default-job-interview",
    user_id: "system",
    title: "💼 Job Interview",
    description:
      "Record candidate profile and resume highlights, assess technical skills with specific examples, review past experience and projects, evaluate cultural fit and team alignment, note their questions and responses, provide overall hiring recommendation.",
    sections: [
      { title: "Candidate Profile", description: "Name, role, and resume highlights" },
      { title: "Technical Assessment", description: "Skills evaluation and problem-solving" },
      { title: "Experience Review", description: "Past projects and relevant background" },
      { title: "Cultural Fit", description: "Values alignment and team dynamics" },
      { title: "Questions & Answers", description: "Candidate questions and responses" },
      { title: "Overall Evaluation", description: "Recommendation and hiring decision" },
    ],
    tags: ["general", "job-interview", "hiring", "candidate", "assessment", "builtin"],
  },
  {
    id: "default-patient-visit",
    user_id: "system",
    title: "🏥 Patient Visit",
    description:
      "Document patient demographics and basic info, record chief complaint and primary concerns, note symptoms with timing and severity, conduct clinical assessment with objective findings, create treatment plan with specific medications, schedule follow-up care.",
    sections: [
      { title: "Patient Information", description: "Name, age, and basic demographics" },
      { title: "Chief Complaint", description: "Primary reason for visit" },
      { title: "Symptoms", description: "Current symptoms and duration" },
      { title: "Assessment", description: "Clinical findings and observations" },
      { title: "Treatment Plan", description: "Recommended treatments and medications" },
      { title: "Follow-up", description: "Next appointment and monitoring plan" },
    ],
    tags: ["patient", "medical", "healthcare", "consultation", "builtin"],
  },
  {
    id: "default-client-meeting-legal",
    user_id: "system",
    title: "🏛️ Client Meeting (Legal)",
    description:
      "Record client contact details and case reference, summarize current case status and key issues, outline legal strategy and recommended actions, list required documents and evidence, note important dates and deadlines, define next action items.",
    sections: [
      { title: "Client Details", description: "Name, contact info, and case reference" },
      { title: "Case Summary", description: "Current status and key issues" },
      { title: "Legal Strategy", description: "Approach and recommended actions" },
      { title: "Documents Needed", description: "Required paperwork and evidence" },
      { title: "Timeline", description: "Important dates and deadlines" },
      { title: "Next Steps", description: "Action items and follow-up tasks" },
    ],
    tags: ["legal", "client", "case", "consultation", "builtin"],
  },
  {
    id: "default-therapy-session",
    user_id: "system",
    title: "💚 Therapy Session",
    description:
      "Note session duration and goals, assess client's current emotional state, document key topics and concerns discussed, capture insights and breakthrough moments, record coping strategies practiced, assign specific homework tasks.",
    sections: [
      { title: "Session Overview", description: "Date, duration, and session goals" },
      { title: "Current State", description: "How the client is feeling today" },
      { title: "Key Topics", description: "Main issues and concerns discussed" },
      { title: "Insights", description: "Breakthroughs and realizations" },
      { title: "Coping Strategies", description: "Tools and techniques practiced" },
      { title: "Homework", description: "Tasks and exercises for next session" },
    ],
    tags: ["healthcare", "therapy", "counseling", "mental-health", "session", "builtin"],
  },
  {
    id: "default-brainstorming",
    user_id: "system",
    title: "💡 Brainstorming Session",
    description:
      "Define the challenge and objectives clearly, capture all ideas generated without judgment, identify promising concepts worth exploring, note constraints and limitations, outline development steps for selected ideas, assign action items with owners.",
    sections: [
      { title: "Challenge", description: "Problem statement and objectives" },
      { title: "Ideas Generated", description: "All concepts and suggestions" },
      { title: "Promising Concepts", description: "Ideas worth exploring further" },
      { title: "Constraints", description: "Limitations and considerations" },
      { title: "Next Steps", description: "How to develop selected ideas" },
      { title: "Action Items", description: "Who does what and when" },
    ],
    tags: ["startup", "brainstorming", "creative", "ideation", "innovation", "builtin"],
  },
  {
    id: "default-coffee-chat",
    user_id: "system",
    title: "☕ Coffee Chat",
    description:
      "Record person's name, role, and connection method, document their professional background and current focus, identify common interests and shared connections, capture valuable insights exchanged, explore potential collaboration opportunities, define follow-up actions.",
    sections: [
      { title: "Person Info", description: "Name, role, and how you connected" },
      { title: "Background", description: "Their experience and current focus" },
      { title: "Common Interests", description: "Shared topics and connections" },
      { title: "Insights Shared", description: "Valuable information exchanged" },
      { title: "Potential Collaboration", description: "Ways to work together" },
      { title: "Follow-up", description: "How to stay in touch and next steps" },
    ],
    tags: ["casual", "coffee-chat", "networking", "relationship", "informal", "builtin"],
  },
];

export const isDefaultTemplate = (templateId: string): boolean => {
  return DEFAULT_TEMPLATES.some(t => t.id === templateId);
};

export const getDefaultTemplate = (templateId: string): Template | undefined => {
  return DEFAULT_TEMPLATES.find(t => t.id === templateId);
};
