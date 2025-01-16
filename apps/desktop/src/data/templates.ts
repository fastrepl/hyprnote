import type { Template } from "@/types/tauri";

export const BUILTIN_TEMPLATES: Template[] = [
  {
    id: "1",
    title: "Standup",
    description:
      "Share updates, highlight roadblocks, and align priorities for the day",
    sections: [
      {
        title: "Yesterday",
        description: `
          - Each participant shares key accomplishments from the previous day.
          - Focus on tasks relevant to the team/project.`.trim(),
      },
      {
        title: "Today",
        description: `
          - Outline what each participant plans to work on.
          - Highlight priority tasks.`.trim(),
      },
      {
        title: "Roadblocks",
        description: `
          - Mention obstacles preventing progress.
          - Identify who can help or next steps for resolution.`.trim(),
      },
    ],
  },
  {
    id: "2",
    title: "Kickoff",
    description:
      "Align stakeholders and set the tone for a new project or initiative",
    sections: [
      {
        title: "Objective",
        description: `
          - Define the project's purpose and expected outcomes.
          - Ensure alignment among all attendees.`.trim(),
      },
      {
        title: "Scope & Deliverables",
        description: `
          - Detail project boundaries, key deliverables, and success criteria.`.trim(),
      },
      {
        title: "Timeline",
        description: `
          - Share high-level milestones and deadlines.`.trim(),
      },
      {
        title: "Responsibilities",
        description: `
          - Assign ownership for each aspect of the project.
          - Include contact points for follow-ups.`.trim(),
      },
    ],
  },
];
