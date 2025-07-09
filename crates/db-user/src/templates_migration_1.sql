-- templates_migration_1.sql
-- Insert default templates

INSERT OR IGNORE INTO templates (id, user_id, title, description, sections, tags)
VALUES 
(
    'default-meeting-notes',
    'placeholder',
    '📝 Meeting Notes',
    'Comprehensive template for meeting notes with agenda, discussion points, and action items',
    '[
        {"title": "Meeting Details", "description": "Date, time, attendees, and meeting purpose"},
        {"title": "Agenda", "description": "Topics to be discussed and objectives"},
        {"title": "Discussion Points", "description": "Key points, decisions, and insights from the meeting"},
        {"title": "Action Items", "description": "Tasks assigned with owners and deadlines"},
        {"title": "Next Steps", "description": "Follow-up actions and next meeting details"}
    ]',
    '["meeting", "agenda", "action-items", "builtin"]'
),
(
    'default-standup',
    'placeholder', 
    '🚀 Daily Standup',
    'Template for daily standup meetings with progress updates and blockers',
    '[
        {"title": "Yesterday", "description": "What was accomplished yesterday"},
        {"title": "Today", "description": "What will be worked on today"},
        {"title": "Blockers", "description": "Any impediments or issues that need attention"},
        {"title": "Goals", "description": "Key objectives for the day/sprint"},
        {"title": "Notes", "description": "Additional updates or important information"}
    ]',
    '["standup", "daily", "progress", "blockers", "builtin"]'
),
(
    'default-project-planning',
    'placeholder',
    '📊 Project Planning',
    'Template for project planning and roadmap creation',
    '[
        {"title": "Project Overview", "description": "Goals, scope, and success criteria"},
        {"title": "Requirements", "description": "Functional and non-functional requirements"},
        {"title": "Timeline", "description": "Milestones, deadlines, and key dates"},
        {"title": "Resources", "description": "Team members, budget, and tools needed"},
        {"title": "Risks", "description": "Potential challenges and mitigation strategies"},
        {"title": "Success Metrics", "description": "How success will be measured"}
    ]',
    '["project", "planning", "roadmap", "requirements", "builtin"]'
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
    '["weekly", "review", "reflection", "planning", "builtin"]'
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
    '["one-on-one", "1-on-1", "management", "feedback", "builtin"]'
),
(
    'default-interview-notes',
    'placeholder',
    '🎤 Interview Notes',
    'Template for conducting and documenting interviews',
    '[
        {"title": "Candidate Info", "description": "Name, role, and background summary"},
        {"title": "Technical Skills", "description": "Assessment of technical capabilities"},
        {"title": "Experience", "description": "Relevant work history and projects"},
        {"title": "Cultural Fit", "description": "Team dynamics and company culture alignment"},
        {"title": "Questions Asked", "description": "Candidate questions and responses"},
        {"title": "Overall Assessment", "description": "Recommendation and next steps"}
    ]',
    '["interview", "hiring", "candidate", "assessment", "builtin"]'
),
(
    'default-research-notes',
    'placeholder',
    '🔍 Research Notes',
    'Template for organizing research findings and insights',
    '[
        {"title": "Research Question", "description": "What are you trying to find out?"},
        {"title": "Sources", "description": "Books, articles, websites, and references"},
        {"title": "Key Findings", "description": "Important discoveries and insights"},
        {"title": "Quotes & Citations", "description": "Relevant quotes with proper attribution"},
        {"title": "Analysis", "description": "Your interpretation and conclusions"},
        {"title": "Next Steps", "description": "Further research needed or actions to take"}
    ]',
    '["research", "findings", "analysis", "sources", "builtin"]'
),
(
    'default-retrospective',
    'placeholder',
    '🔄 Retrospective',
    'Template for team retrospectives and process improvement',
    '[
        {"title": "What Went Well", "description": "Positive aspects and successes"},
        {"title": "What Could Be Better", "description": "Areas for improvement"},
        {"title": "Action Items", "description": "Specific improvements to implement"},
        {"title": "Experiments", "description": "New approaches to try"},
        {"title": "Appreciation", "description": "Recognition and thanks for team members"}
    ]',
    '["retrospective", "improvement", "team", "process", "builtin"]'
),
(
    'default-decision-log',
    'placeholder',
    '⚡ Decision Log',
    'Template for documenting important decisions and their rationale',
    '[
        {"title": "Decision", "description": "What was decided?"},
        {"title": "Context", "description": "Background and situation that led to this decision"},
        {"title": "Options Considered", "description": "Alternative approaches that were evaluated"},
        {"title": "Rationale", "description": "Why this decision was made"},
        {"title": "Impact", "description": "Expected outcomes and consequences"},
        {"title": "Review Date", "description": "When to revisit this decision"}
    ]',
    '["decision", "rationale", "documentation", "impact", "builtin"]'
),
(
    'default-book-summary',
    'placeholder',
    '📚 Book Summary',
    'Template for summarizing books and key takeaways',
    '[
        {"title": "Book Details", "description": "Title, author, and publication info"},
        {"title": "Main Themes", "description": "Core concepts and central arguments"},
        {"title": "Key Insights", "description": "Most important learnings and revelations"},
        {"title": "Actionable Points", "description": "Practical applications and next steps"},
        {"title": "Quotes", "description": "Notable quotes and passages"},
        {"title": "Personal Reflection", "description": "Your thoughts and how it relates to your work/life"}
    ]',
    '["book", "summary", "learning", "insights", "builtin"]'
);