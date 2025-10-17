import { ProviderCard, Section } from "./shared";

export function LLM() {
  return (
    <Section title="LLM providers" description="Large language model services">
      <ProviderCard name="Anthropic" />
      <ProviderCard name="OpenAI" configured modelInUse="chatgpt-4o-latest" />
      <ProviderCard name="Ollama" />
      <ProviderCard name="LM Studio" />
    </Section>
  );
}
