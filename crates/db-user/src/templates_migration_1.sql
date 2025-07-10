-- templates_migration_1.sql
-- Insert default templates
INSERT
  OR IGNORE INTO templates (id, user_id, title, description, sections, tags)
VALUES
  (
    'default-meeting-notes',
    'placeholder',
    '📝 General Meeting',
    'Comprehensive template for meeting notes with agenda, discussion points, and action items',
    '[
        {"title": "Meeting Details", "description": "Date, time, attendees, and meeting purpose"},
        {"title": "Agenda", "description": "Topics to be discussed and objectives"},
        {"title": "Discussion Points", "description": "Key points, decisions, and insights from the meeting"},
        {"title": "Action Items", "description": "Tasks assigned with owners and deadlines"},
        {"title": "Next Steps", "description": "Follow-up actions and next meeting details"}
    ]',
    '["general", "meeting", "agenda", "action-items", "builtin"]'
  ),
  (
    'default-standup',
    'placeholder',
    '🌞 Daily Standup',
    'Template for daily standup meetings with progress updates and blockers',
    '[
        {"title": "Yesterday", "description": "What was accomplished yesterday"},
        {"title": "Today", "description": "What will be worked on today"},
        {"title": "Blockers", "description": "Any impediments or issues that need attention"},
        {"title": "Goals", "description": "Key objectives for the day/sprint"},
        {"title": "Notes", "description": "Additional updates or important information"}
    ]',
    '["general","standup", "daily", "progress", "blockers", "builtin"]'
  ),
  (
    'default-weekly-review',
    'placeholder',
    '📅 Weekly Review',
    'Template for weekly reflection and planning',
    '[
        {"title": "Achievements", "description": "What was accomplished this week"},
        {"title": "Challenges", "description": "Obstacles faced and how they were handled"},
        {"title": "Lessons Learned", "description": "Key insights and takeaways"},
        {"title": "Next Week Goals", "description": "Priorities and objectives for next week"},
        {"title": "Improvements", "description": "Areas for personal or process improvement"}
    ]',
    '["general","weekly", "review", "reflection", "planning", "builtin"]'
  ),
  (
    'default-one-on-one',
    'placeholder',
    '👥 1-on-1 Meeting',
    'Template for one-on-one meetings with team members',
    '[
        {"title": "Check-in", "description": "How are things going overall?"},
        {"title": "Recent Work", "description": "Updates on current projects and tasks"},
        {"title": "Challenges", "description": "Any blockers or difficulties"},
        {"title": "Career Development", "description": "Growth opportunities and feedback"},
        {"title": "Team Feedback", "description": "Thoughts on team dynamics and processes"},
        {"title": "Action Items", "description": "Follow-up tasks and commitments"}
    ]',
    '["general","one-on-one", "1-on-1", "management", "feedback", "builtin"]'
  ),
  (
    'default-user-interview',
    'placeholder',
    '👤 User Interview',
    'Template for conducting user research and feedback sessions',
    '[
        {"title": "Participant Info", "description": "Name, role, and background details"},
        {"title": "Research Goals", "description": "What we want to learn from this session"},
        {"title": "User Behavior", "description": "How they currently solve the problem"},
        {"title": "Pain Points", "description": "Frustrations and challenges they face"},
        {"title": "Feature Feedback", "description": "Reactions to proposed solutions"},
        {"title": "Key Insights", "description": "Important learnings and next steps"}
    ]',
    '["startup", "user-interview", "research", "feedback", "ux", "builtin"]'
  ),
  (
    'default-b2b-discovery',
    'placeholder',
    '🔍 B2B Customer: Discovery',
    'Template for B2B sales discovery calls and needs assessment',
    '[
        {"title": "Company Background", "description": "Organization size, industry, and context"},
        {"title": "Current Challenges", "description": "Problems they are trying to solve"},
        {"title": "Existing Solutions", "description": "What they use now and limitations"},
        {"title": "Decision Process", "description": "How decisions are made and key stakeholders"},
        {"title": "Requirements", "description": "Must-have features and success criteria"},
        {"title": "Next Steps", "description": "Follow-up actions and timeline"}
    ]',
    '["startup", "b2b", "discovery", "sales", "customer", "builtin"]'
  ),
  (
    'default-b2b-pilot',
    'placeholder',
    '🚀 B2B Customer: Pilot',
    'Template for B2B pilot program meetings and progress reviews',
    '[
        {"title": "Pilot Overview", "description": "Goals, scope, and success metrics"},
        {"title": "Progress Update", "description": "Current status and milestones achieved"},
        {"title": "User Feedback", "description": "How the team is using the solution"},
        {"title": "Challenges", "description": "Issues encountered and resolution status"},
        {"title": "Value Delivered", "description": "Benefits and ROI demonstrated"},
        {"title": "Next Phase", "description": "Plans for expansion or full deployment"}
    ]',
    '["startup", "b2b", "pilot", "customer", "progress", "builtin"]'
  ),
  (
    'default-job-interview',
    'placeholder',
    '💼 Job Interview',
    'Template for conducting job interviews and candidate assessment',
    '[
        {"title": "Candidate Profile", "description": "Name, role, and resume highlights"},
        {"title": "Technical Assessment", "description": "Skills evaluation and problem-solving"},
        {"title": "Experience Review", "description": "Past projects and relevant background"},
        {"title": "Cultural Fit", "description": "Values alignment and team dynamics"},
        {"title": "Questions & Answers", "description": "Candidate questions and responses"},
        {"title": "Overall Evaluation", "description": "Recommendation and hiring decision"}
    ]',
    '["general","job-interview", "hiring", "candidate", "assessment", "builtin"]'
  ),
  (
    'default-patient-visit',
    'placeholder',
    '🏥 Patient Visit',
    'Template for healthcare patient visits and medical consultations',
    '[
        {"title": "Patient Information", "description": "Name, age, and basic demographics"},
        {"title": "Chief Complaint", "description": "Primary reason for visit"},
        {"title": "Symptoms", "description": "Current symptoms and duration"},
        {"title": "Assessment", "description": "Clinical findings and observations"},
        {"title": "Treatment Plan", "description": "Recommended treatments and medications"},
        {"title": "Follow-up", "description": "Next appointment and monitoring plan"}
    ]',
    '["patient", "medical", "healthcare", "consultation", "builtin"]'
  ),
  (
    'default-client-meeting-legal',
    'placeholder',
    '🏛️ Client Meeting (Legal)',
    'Template for legal client meetings and case discussions',
    '[
        {"title": "Client Details", "description": "Name, contact info, and case reference"},
        {"title": "Case Summary", "description": "Current status and key issues"},
        {"title": "Legal Strategy", "description": "Approach and recommended actions"},
        {"title": "Documents Needed", "description": "Required paperwork and evidence"},
        {"title": "Timeline", "description": "Important dates and deadlines"},
        {"title": "Next Steps", "description": "Action items and follow-up tasks"}
    ]',
    '["legal", "client", "case", "consultation", "builtin"]'
  ),
  (
    'default-therapy-session',
    'placeholder',
    '💚 Therapy Session',
    'Template for therapy and counseling sessions',
    '[
        {"title": "Session Overview", "description": "Date, duration, and session goals"},
        {"title": "Current State", "description": "How the client is feeling today"},
        {"title": "Key Topics", "description": "Main issues and concerns discussed"},
        {"title": "Insights", "description": "Breakthroughs and realizations"},
        {"title": "Coping Strategies", "description": "Tools and techniques practiced"},
        {"title": "Homework", "description": "Tasks and exercises for next session"}
    ]',
    '["healthcare", "therapy", "counseling", "mental-health", "session", "builtin"]'
  ),
  (
    'default-brainstorming',
    'placeholder',
    '💡 Brainstorming Session',
    'Template for creative brainstorming and ideation sessions',
    '[
        {"title": "Challenge", "description": "Problem statement and objectives"},
        {"title": "Ideas Generated", "description": "All concepts and suggestions"},
        {"title": "Promising Concepts", "description": "Ideas worth exploring further"},
        {"title": "Constraints", "description": "Limitations and considerations"},
        {"title": "Next Steps", "description": "How to develop selected ideas"},
        {"title": "Action Items", "description": "Who does what and when"}
    ]',
    '["startup","brainstorming", "creative", "ideation", "innovation", "builtin"]'
  ),
  (
    'default-coffee-chat',
    'placeholder',
    '☕ Coffee Chat',
    'Template for informal networking and relationship building meetings',
    '[
        {"title": "Person Info", "description": "Name, role, and how you connected"},
        {"title": "Background", "description": "Their experience and current focus"},
        {"title": "Common Interests", "description": "Shared topics and connections"},
        {"title": "Insights Shared", "description": "Valuable information exchanged"},
        {"title": "Potential Collaboration", "description": "Ways to work together"},
        {"title": "Follow-up", "description": "How to stay in touch and next steps"}
    ]',
    '["casual","coffee-chat", "networking", "relationship", "informal", "builtin"]'
  );
