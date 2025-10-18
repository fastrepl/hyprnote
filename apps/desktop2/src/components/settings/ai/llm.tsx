import { Section } from "./shared";

import { useEffect } from "react";
import { useUpdateAIProvider } from "../shared";

export function LLM() {
  return (
    <Section title="LLM providers" description="Large language model services">
      {["openai", "anthropic", "ollama", "lmstudio"].map((name) => <CloudProviderCard key={name} name={name} />)}
    </Section>
  );
}

function CloudProviderCard({ name }: { name: string }) {
  const { data, isValid, isSaved, setField, errors, hasEdits } = useUpdateAIProvider("llm", name);

  useEffect(() => {
    console.log(name, { data, isValid, errors, hasEdits });
  }, [name, data, isValid, errors, hasEdits]);

  return (
    <div className="space-y-2 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{name}</h3>
        <div className="flex gap-2 text-xs">
          {isSaved && <span className="text-green-600">✓ Saved</span>}
          {!isValid && hasEdits && <span className="text-amber-600">⚠ Invalid</span>}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600">Model</label>
        <input
          value={data.model ?? ""}
          onChange={(e) => setField("model", e.target.value)}
          className="w-full px-2 py-1 border rounded"
          placeholder="e.g., gpt-4"
        />
        {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model}</p>}
      </div>

      <div>
        <label className="block text-sm text-gray-600">Base URL</label>
        <input
          value={data.base_url ?? ""}
          onChange={(e) => setField("base_url", e.target.value)}
          className="w-full px-2 py-1 border rounded"
          placeholder="e.g., https://api.openai.com/v1"
        />
        {errors.base_url && <p className="text-red-500 text-xs mt-1">{errors.base_url}</p>}
      </div>

      <div>
        <label className="block text-sm text-gray-600">API Key</label>
        <input
          type="password"
          value={data.api_key ?? ""}
          onChange={(e) => setField("api_key", e.target.value)}
          className="w-full px-2 py-1 border rounded"
          placeholder="sk-..."
        />
        {errors.api_key && <p className="text-red-500 text-xs mt-1">{errors.api_key}</p>}
      </div>
    </div>
  );
}
