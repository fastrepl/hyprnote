import { Experimental_Agent as Agent, type LanguageModel, stepCountIs, tool } from "ai";
import { z } from "zod";

export function createEnhancingAgent(model: LanguageModel) {
  return new Agent({
    model,
    stopWhen: stepCountIs(10),
    system: `You are an expert at creating structured, comprehensive meeting summaries.
  
  Your approach:
  1. First, analyze the raw content to identify key themes and structure
  2. Extract and organize action items, decisions, and important points
  3. Finally, generate a well-formatted markdown summary
  
  Format requirements:
  - Start with an h1 header for the meeting title
  - Use h2 and h3 headers for sections (no deeper than h3)
  - Each section should have at least 5 detailed bullet points
  - Be clear, concise, and actionable
  
  IMPORTANT: Your final output MUST be ONLY the markdown summary itself.
  Do NOT include any explanations, commentary, or meta-discussion.
  Do NOT say things like "Here's the summary" or "I've analyzed".
  Output ONLY the formatted markdown document, starting directly with the h2 header. No h1 needed.`,
    tools: {
      analyzeStructure: tool({
        description: "Analyze raw meeting content to identify key themes, topics, and overall structure",
        inputSchema: z.object({
          content: z.string().describe("Raw meeting content to analyze"),
        }),
        execute: async ({ content }) => {
          const themes = [];
          if (content.toLowerCase().includes("decision")) {
            themes.push("Decisions Made");
          }
          if (content.toLowerCase().includes("action") || content.toLowerCase().includes("todo")) {
            themes.push("Action Items");
          }
          if (content.toLowerCase().includes("discuss")) {
            themes.push("Discussion Points");
          }

          return {
            suggestedSections: themes.length > 0 ? themes : ["Overview", "Key Points", "Next Steps"],
            contentLength: content.length,
            hasStructure: content.includes("#") || content.includes("*"),
          };
        },
      }),
      extractKeyPoints: tool({
        description: "Extract important points, decisions, and action items from meeting content",
        inputSchema: z.object({
          content: z.string().describe("Content to extract key points from"),
          focusArea: z.string().optional().describe("Specific area to focus on (e.g., 'decisions', 'action items')"),
        }),
        execute: async ({ content, focusArea }) => {
          const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
          const keyPoints = sentences.slice(0, Math.min(10, sentences.length));

          return {
            extractedPoints: keyPoints,
            count: keyPoints.length,
            focusArea: focusArea || "general",
          };
        },
      }),
    },
  });
}
