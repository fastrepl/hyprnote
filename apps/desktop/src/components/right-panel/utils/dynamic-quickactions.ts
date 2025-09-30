import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";

interface QuickAction {
  shownTitle: string;
  actualPrompt: string;
  eventName: string;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    shownTitle: "Create a concise one-paragraph summary",
    actualPrompt: "Make this meeting note more concise",
    eventName: "chat_shorten_summary",
  },
  {
    shownTitle: "List all the action items that were decided",
    actualPrompt: "Extract action items from this meeting",
    eventName: "chat_extract_action_items",
  },
  {
    shownTitle: "Important Q&As",
    actualPrompt: "Tell me the most important questions asked in this meeting and the answers",
    eventName: "chat_important_qas",
  },
  {
    shownTitle: "What are the next steps?",
    actualPrompt: "What are the next steps or follow-up meetings we should schedule based on this discussion?",
    eventName: "chat_dynamic_quickaction",
  },
];

export async function getDynamicQuickActions(sessionId: string | null): Promise<QuickAction[]> {
  try {
    if (!sessionId) {
      return DEFAULT_ACTIONS;
    }

    const session = await dbCommands.getSession({ id: sessionId });
    if (!session) {
      return DEFAULT_ACTIONS;
    }

    const isPreMeeting = !session.enhanced_memo_html;

    const participants = await dbCommands.sessionListParticipants(sessionId);
    const hasParticipants = participants.length > 0;

    const llmConnection = await connectorCommands.getLlmConnection();
    const { type } = llmConnection;
    const apiBase = llmConnection.connection?.api_base;
    const customModel = await connectorCommands.getCustomLlmModel();
    const modelId = type === "Custom" && customModel ? customModel : "gpt-4";

    const isHyprCloud = apiBase?.includes("pro.hyprnote.com");
    const isLocal = type === "HyprLocal";
    const isToolEnabledCustom = !isHyprCloud && !isLocal && (
      modelId === "gpt-4.1"
      || modelId === "openai/gpt-4.1"
      || modelId === "anthropic/claude-sonnet-4"
      || modelId === "openai/gpt-4o"
      || modelId === "gpt-4o"
      || modelId === "openai/gpt-5"
    );

    if (isPreMeeting) {
      if (isLocal) {
        return generatePreMeetingLocal();
      } else if (isHyprCloud) {
        return generatePreMeetingHyprCloud(hasParticipants, participants);
      } else if (isToolEnabledCustom) {
        return generatePreMeetingCustomWithTools();
      } else {
        return generatePreMeetingCustomNoTools();
      }
    } else {
      if (isLocal) {
        return generatePostMeetingLocal();
      } else if (isHyprCloud) {
        return generatePostMeetingHyprCloud(hasParticipants, participants);
      } else if (isToolEnabledCustom) {
        return generatePostMeetingCustomWithTools(hasParticipants, participants);
      } else {
        return generatePostMeetingCustomNoTools();
      }
    }
  } catch (error) {
    console.error("Error generating dynamic quick actions:", error);
    return DEFAULT_ACTIONS;
  }
}

function generatePreMeetingLocal(): QuickAction[] {
  return [
    {
      shownTitle: "Draft pre-meeting template",
      actualPrompt: "Create a pre-meeting template with agenda items, objectives, and questions to ask",
      eventName: "chat_dynamic_quickaction",
    },
    {
      shownTitle: "Things to ask in this meeting",
      actualPrompt: "What are important questions I should ask in this meeting to make it productive?",
      eventName: "chat_dynamic_quickaction",
    },
    {
      shownTitle: "Give me courage before meeting",
      actualPrompt: "Give me encouragement and wisdom before going into this meeting",
      eventName: "chat_dynamic_quickaction",
    },
    {
      shownTitle: "What to think before meeting?",
      actualPrompt: "What should I think about or prepare mentally before this meeting?",
      eventName: "chat_dynamic_quickaction",
    },
  ];
}

function generatePreMeetingCustomNoTools(): QuickAction[] {
  return generatePreMeetingLocal();
}

function generatePreMeetingCustomWithTools(): QuickAction[] {
  return [
    {
      shownTitle: "Draft pre-meeting template",
      actualPrompt: "Create a pre-meeting template with agenda items, objectives, and questions to ask",
      eventName: "chat_dynamic_quickaction",
    },
    {
      shownTitle: "Things to ask in this meeting",
      actualPrompt: "What are important questions I should ask in this meeting to make it productive?",
      eventName: "chat_dynamic_quickaction",
    },
    {
      shownTitle: "Analyze related past meetings",
      actualPrompt:
        "Search my Hyprnote for related past meeting notes and give me insights on what was discussed before",
      eventName: "chat_dynamic_quickaction",
    },
    {
      shownTitle: "What to think before meeting?",
      actualPrompt: "What should I think about or prepare mentally before this meeting?",
      eventName: "chat_dynamic_quickaction",
    },
  ];
}

function generatePreMeetingHyprCloud(hasParticipants: boolean, participants: any[]): QuickAction[] {
  const lastAction = hasParticipants
    ? {
      shownTitle: "Research meeting participants",
      actualPrompt: `Search the web for information about ${
        participants.map(p => p.full_name).join(", ")
      } to help me prepare for this meeting`,
      eventName: "chat_dynamic_quickaction",
    }
    : {
      shownTitle: "Web search to prepare",
      actualPrompt: "Search the web for relevant information to help me prepare for this meeting",
      eventName: "chat_dynamic_quickaction",
    };

  return [
    {
      shownTitle: "Draft pre-meeting template",
      actualPrompt: "Create a pre-meeting template with agenda items, objectives, and questions to ask",
      eventName: "chat_dynamic_quickaction",
    },
    {
      shownTitle: "Things to ask in this meeting",
      actualPrompt: "What are important questions I should ask in this meeting to make it productive?",
      eventName: "chat_dynamic_quickaction",
    },
    {
      shownTitle: "Analyze related past meetings",
      actualPrompt:
        "Search my Hyprnote for related past meeting notes and give me insights on what was discussed before",
      eventName: "chat_dynamic_quickaction",
    },
    lastAction,
  ];
}

function generatePostMeetingLocal(): QuickAction[] {
  return [
    {
      shownTitle: "Shorten summary",
      actualPrompt: "Make this meeting note more concise",
      eventName: "chat_shorten_summary",
    },
    {
      shownTitle: "Extract action items",
      actualPrompt: "Extract action items from this meeting",
      eventName: "chat_extract_action_items",
    },
    {
      shownTitle: "Important questions asked",
      actualPrompt: "Tell me the most important questions asked in this meeting and the answers",
      eventName: "chat_important_qas",
    },
    {
      shownTitle: "What are next steps?",
      actualPrompt: "What are the next steps or follow-up meetings we should schedule based on this discussion?",
      eventName: "chat_dynamic_quickaction",
    },
  ];
}

function generatePostMeetingCustomNoTools(): QuickAction[] {
  return generatePostMeetingLocal();
}

function generatePostMeetingCustomWithTools(hasParticipants: boolean, participants: any[]): QuickAction[] {
  const lastAction = hasParticipants && participants.length > 0
    ? {
      shownTitle: `Past conversations with ${participants[0].full_name}...`,
      actualPrompt: `Search my Hyprnote for all past conversations and meetings with ${
        participants.map(p => p.full_name).join(", ")
      }`,
      eventName: "chat_dynamic_quickaction",
    }
    : {
      shownTitle: "Analyze related past meetings",
      actualPrompt: "Search my Hyprnote for related past meetings and show patterns or recurring topics",
      eventName: "chat_dynamic_quickaction",
    };

  return [
    {
      shownTitle: "Shorten summary",
      actualPrompt: "Make this meeting note more concise",
      eventName: "chat_shorten_summary",
    },
    {
      shownTitle: "Enrich with other contexts",
      actualPrompt: "Enrich this summary with relevant context from my other Hyprnote meeting notes",
      eventName: "chat_dynamic_quickaction",
    },
    {
      shownTitle: "Extract action items",
      actualPrompt: "Extract action items from this meeting",
      eventName: "chat_extract_action_items",
    },
    lastAction,
  ];
}

function generatePostMeetingHyprCloud(hasParticipants: boolean, participants: any[]): QuickAction[] {
  const lastAction = hasParticipants && participants.length > 0
    ? {
      shownTitle: `Past conversations with ${participants[0].full_name}...`,
      actualPrompt: `Search my Hyprnote for all past conversations and meetings with ${
        participants.map(p => p.full_name).join(", ")
      }`,
      eventName: "chat_dynamic_quickaction",
    }
    : {
      shownTitle: "Analyze related past meetings",
      actualPrompt: "Search my Hyprnote for related past meetings and show patterns or recurring topics",
      eventName: "chat_dynamic_quickaction",
    };

  return [
    lastAction,
    {
      shownTitle: "Shorten summary",
      actualPrompt: "Make this meeting note more concise",
      eventName: "chat_shorten_summary",
    },
    {
      shownTitle: "Enrich summary with web search",
      actualPrompt: "Enrich this summary with relevant information from web search about the topics discussed",
      eventName: "chat_dynamic_quickaction",
    },
    {
      shownTitle: "Extract action items",
      actualPrompt: "Extract action items from this meeting",
      eventName: "chat_extract_action_items",
    },
  ];
}
