// Must stay in sync with SELECTABLE_MODELS in crates/llm-proxy/src/model.rs;
// the proxy routes any other id to its task default.
export const ANARLOG_PRO_LLM_MODELS = [
  { id: "Auto", label: "Pro (Cloud)", inputModalities: ["text", "image"] },
  {
    id: "~anthropic/claude-sonnet-latest",
    label: "Claude Sonnet",
    inputModalities: ["text", "image"],
  },
  {
    id: "~anthropic/claude-opus-latest",
    label: "Claude Opus",
    inputModalities: ["text", "image"],
  },
  {
    id: "~anthropic/claude-haiku-latest",
    label: "Claude Haiku",
    inputModalities: ["text", "image"],
  },
  {
    id: "~openai/gpt-sol-latest",
    label: "GPT Sol",
    inputModalities: ["text", "image"],
  },
  {
    id: "~openai/gpt-astra-latest",
    label: "GPT Astra",
    inputModalities: ["text", "image"],
  },
  {
    id: "~openai/gpt-terra-latest",
    label: "GPT Terra",
    inputModalities: ["text", "image"],
  },
  {
    id: "~openai/gpt-luna-latest",
    label: "GPT Luna",
    inputModalities: ["text", "image"],
  },
  {
    id: "~google/gemini-pro-latest",
    label: "Gemini Pro",
    inputModalities: ["text", "image"],
  },
  {
    id: "~google/gemini-flash-latest",
    label: "Gemini Flash",
    inputModalities: ["text", "image"],
  },
  {
    id: "~x-ai/grok-latest",
    label: "Grok",
    inputModalities: ["text", "image"],
  },
  {
    id: "~moonshotai/kimi-latest",
    label: "Kimi",
    inputModalities: ["text", "image"],
  },
  {
    id: "~deepseek/deepseek-pro-latest",
    label: "DeepSeek Pro",
    inputModalities: ["text"],
  },
  {
    id: "~deepseek/deepseek-flash-latest",
    label: "DeepSeek Flash",
    inputModalities: ["text", "image"],
  },
  { id: "~z-ai/glm-latest", label: "GLM", inputModalities: ["text"] },
  {
    id: "~z-ai/glm-flash-latest",
    label: "GLM Flash",
    inputModalities: ["text", "image"],
  },
] as const;

export function anarlogProLlmModelLabel(model: string): string | undefined {
  return ANARLOG_PRO_LLM_MODELS.find(({ id }) => id === model)?.label;
}
