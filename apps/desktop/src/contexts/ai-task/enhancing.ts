import { Experimental_Agent as Agent, generateText, type LanguageModel, stepCountIs, Tool, tool } from "ai";
import { z } from "zod";

export function createEnhancingAgent(model: LanguageModel, extraTools: Record<string, Tool> = {}) {
  const system = `
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

  const tools: Record<string, Tool> = {
    analyzeStructure: tool({
      description: "Analyze raw meeting content to identify key themes, topics, and overall structure",
      inputSchema: z.object({
        max_num_sections: z
          .number()
          .describe(`Maximum number of sections to generate. 
            Based on the content, decide the number of sections to generate.`),
      }),
      execute: async ({ max_num_sections }, { messages }) => {
        const lastMessage = messages[messages.length - 1];
        const input = typeof lastMessage.content === "string"
          ? lastMessage.content
          : lastMessage.content.map((part) => part.type === "text" ? part.text : "").join("\n");

        const { content: output } = await generateText({
          model,
          prompt: `
            Analyze this meeting content and suggest appropriate section headings for a comprehensive summary. 
            The sections should cover the main themes and topics discussed.
            Generate around ${max_num_sections} sections based on the content depth.
            Give me in bullet points.
        
            Content: ${input}`,
        });

        return output;
      },
    }),
    ...extraTools,
  };

  return new Agent({
    model,
    stopWhen: stepCountIs(10),
    system,
    tools,
    prepareStep: async ({ stepNumber }) => {
      if (stepNumber === 0) {
        return {
          toolChoice: { type: "tool", toolName: "analyzeStructure" },
        };
      }

      return { toolChoice: "none" };
    },
  });
}
