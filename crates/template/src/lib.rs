pub fn auto() -> hypr_db::user::Template {
    hypr_db::user::Template {
        id: "0".to_string(),
        title: "Auto template".to_string(),
        description: "No specific format specified. Just use the available information to write structured content".to_string(),
        sections: vec![],
    }
}

pub fn standup() -> hypr_db::user::Template {
    hypr_db::user::Template {
        id: "1".to_string(),
        title: "Standup".to_string(),
        description: "Share updates, highlight roadblocks, and align priorities for the day".to_string(),
        sections: vec![
            hypr_db::user::TemplateSection {
                title: "Yesterday".to_string(),
                description: "- Each participant shares key accomplishments from the previous day.\n- Focus on tasks relevant to the team/project.".to_string(),
            },
            hypr_db::user::TemplateSection {
                title: "Today".to_string(),
                description: "- Outline what each participant plans to work on.\n- Highlight priority tasks.".to_string(),
            },
            hypr_db::user::TemplateSection {
                title: "Roadblocks".to_string(),
                description: "- Mention obstacles preventing progress.\n- Identify who can help or next steps for resolution.".to_string(),
            },
        ],
    }
}

pub fn kickoff() -> hypr_db::user::Template {
    hypr_db::user::Template {
        id: "2".to_string(),
        title: "Kickoff".to_string(),
        description: "Align stakeholders and set the tone for a new project or initiative".to_string(),
        sections: vec![
            hypr_db::user::TemplateSection {
                title: "Objective".to_string(),
                description: "- Define the project's purpose and expected outcomes.\n- Ensure alignment among all attendees.".to_string(),
            },
            hypr_db::user::TemplateSection {
                title: "Scope & Deliverables".to_string(),
                description: "- Detail project boundaries, key deliverables, and success criteria.".to_string(),
            },
            hypr_db::user::TemplateSection {
                title: "Timeline".to_string(),
                description: "- Share high-level milestones and deadlines.".to_string(),
            },
            hypr_db::user::TemplateSection {
                title: "Responsibilities".to_string(),
                description: "- Assign ownership for each aspect of the project.\n- Include contact points for follow-ups.".to_string(),
            },
        ],
    }
}

pub fn builtins() -> Vec<hypr_db::user::Template> {
    vec![auto(), standup(), kickoff()]
}
