import { smoothStream } from "ai";
import { Experimental_Agent as Agent, generateText, type LanguageModel, stepCountIs, Tool, tool } from "ai";
import { z } from "zod";

import { commands as templateCommands } from "@hypr/plugin-template";
import type { Store as PersistedStore } from "../../../tinybase/persisted";
import { trimBeforeMarker } from "../shared/transform_impl";
import type { TaskConfig } from ".";

export const enhance: TaskConfig = {
  getSystem,
  getPrompt,
  getAgent: (model, tools = {}) => getAgent(model, tools),
  transforms: [trimBeforeMarker("##"), smoothStream({ delayInMs: 100, chunking: "line" })],
};

async function getSystem() {
  const result = await templateCommands.render("enhance.system", {});
  if (result.status === "ok") {
    return result.data;
  }
  console.error("Failed to render enhance system prompt:", result.error);
  throw new Error(result.error);
}

async function getPrompt(args?: Record<string, unknown>, store?: PersistedStore) {
  if (!store || !args?.sessionId) {
    const error = "Session ID is required";
    console.error("Failed to get enhance prompt:", error);
    throw new Error(error);
  }

  const sessionId = args.sessionId as string;
  const rawMd = (store.getCell("sessions", sessionId, "raw_md") as string) || "";
  const sessionData = getSessionData(sessionId, store);
  const participants = getParticipants(sessionId, store);

  const result = await templateCommands.render("enhance.user", {
    content: rawMd,
    session: sessionData,
    participants,
  });
  if (result.status === "ok") {
    return result.data;
  }
  console.error("Failed to render enhance user prompt:", result.error);
  throw new Error(result.error);
}

function getSessionData(sessionId: string, store: PersistedStore) {
  const rawTitle = store.getCell("sessions", sessionId, "title") as string;
  const eventId = store.getCell("sessions", sessionId, "event_id") as string;

  if (eventId) {
    return {
      title: store.getCell("events", eventId, "title") as string || rawTitle,
      started_at: store.getCell("events", eventId, "started_at") as string,
      ended_at: store.getCell("events", eventId, "ended_at") as string,
      location: store.getCell("events", eventId, "location") as string,
      description: store.getCell("events", eventId, "description") as string,
      is_event: true,
    };
  }

  return {
    title: rawTitle,
    is_event: false,
  };
}

function getParticipants(sessionId: string, store: PersistedStore) {
  const participantIds: string[] = [];

  store.forEachRow("mapping_session_participant", (mappingId, _forEachCell) => {
    const mappingSessionId = store.getCell("mapping_session_participant", mappingId, "session_id");
    if (mappingSessionId === sessionId) {
      const humanId = store.getCell("mapping_session_participant", mappingId, "human_id") as string;
      if (humanId) {
        participantIds.push(humanId);
      }
    }
  });

  return participantIds.map((humanId) => ({
    name: store.getCell("humans", humanId, "name") as string,
    job_title: store.getCell("humans", humanId, "job_title") as string,
  })).filter((p) => p.name);
}

function getAgent(model: LanguageModel, extraTools: Record<string, Tool> = {}) {
  const tools: Record<string, Tool> = {
    analyzeStructure: createAnalyzeStructureTool(model),
    ...extraTools,
  };

  return new Agent({
    model,
    stopWhen: stepCountIs(10),
    system: AGENT_SYSTEM_PROMPT,
    tools,
    prepareStep: async ({ stepNumber }) => {
      if (stepNumber === 0) {
        return { toolChoice: { type: "tool", toolName: "analyzeStructure" } };
      }
      return { toolChoice: "none" };
    },
  });
}

function createAnalyzeStructureTool(model: LanguageModel) {
  return tool({
    description: "Analyze raw meeting content to identify key themes, topics, and overall structure",
    inputSchema: z.object({
      max_num_sections: z
        .number()
        .describe(
          "Maximum number of sections to generate. Based on the content, decide the number of sections to generate.",
        ),
    }),
    execute: async ({ max_num_sections }, { messages }) => {
      const lastMessage = messages[messages.length - 1];
      const input = typeof lastMessage.content === "string"
        ? lastMessage.content
        : lastMessage.content.map((part) => part.type === "text" ? part.text : "").join("\n");

      const { content: output } = await generateText({
        model,
        prompt: `Analyze this meeting content and suggest appropriate section headings for a comprehensive summary. 
The sections should cover the main themes and topics discussed.
Generate around ${max_num_sections} sections based on the content depth.
Give me in bullet points.

Content: ${input}`,
      });

      return output;
    },
  });
}

const AGENT_SYSTEM_PROMPT = `
You are an expert at creating structured, comprehensive meeting summaries.

Format requirements:
- Do not use h1, start with h2(##)
- Use h2 and h3 headers for sections (no deeper than h3)
- Each section should have at least 5 detailed bullet points

Workflow:
1. User provides raw meeting content.
2. You analyze the content and decide the sections to use. (Using analyzeStructure)
3. You generate a well-formatted markdown summary, following the format requirements.

IMPORTANT: Your final output MUST be ONLY the markdown summary itself.
Do NOT include any explanations, commentary, or meta-discussion.
Do NOT say things like "Here's the summary" or "I've analyzed".
`.trim();
