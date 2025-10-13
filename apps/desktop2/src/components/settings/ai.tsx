import { useState } from "react";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Input } from "@hypr/ui/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";
import { cn } from "@hypr/ui/lib/utils";
import { useQuery } from "../../hooks/useQuery";

export function SettingsAI() {
  const [activeTab, setActiveTab] = useState<"transcription" | "intelligence">("transcription");

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
      <TabsList className="mb-6 w-full grid grid-cols-2">
        <TabsTrigger value="transcription">Transcription</TabsTrigger>
        <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
      </TabsList>
      <TabsContent value="transcription" className="w-full">
        <TranscriptionSettings />
      </TabsContent>
      <TabsContent value="intelligence" className="w-full">
        <IntelligenceSettings />
      </TabsContent>
    </Tabs>
  );
}

function TranscriptionSettings() {
  const parakeet2 = useQuery({
    queryFn: () => localSttCommands.isModelDownloaded("am-parakeet-v2"),
    refetchInterval: 1500,
  });

  const parakeet3 = useQuery({
    queryFn: () => localSttCommands.isModelDownloaded("am-parakeet-v3"),
    refetchInterval: 1500,
  });

  return (
    <div className="space-y-8">
      <Section title="On-device models" description="Local transcription models">
        <ModelCard
          name="Parakeet-2"
          description="For English-only conversations"
          status={JSON.stringify(parakeet2.data)}
        />
        <ModelCard
          name="Parakeet-3"
          description="For European languages"
          status={JSON.stringify(parakeet3.data)}
        />
      </Section>

      <Section title="Speech-to-text providers" description="Cloud-based transcription services">
        <ProviderCard name="Deepgram" />
        <ProviderCard name="Assembly AI" configured />
      </Section>
    </div>
  );
}

function IntelligenceSettings() {
  return (
    <Section title="LLM providers" description="Large language model services">
      <ProviderCard name="Anthropic" />
      <ProviderCard name="OpenAI" configured modelInUse="chatgpt-4o-latest" />
      <ProviderCard name="Ollama" />
      <ProviderCard name="LM Studio" />
    </Section>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ModelCard({
  name,
  description,
  status,
}: {
  name: string;
  description: string;
  status: string;
}) {
  return (
    <div
      className={cn([
        "p-4 rounded-lg border-2 transition-all cursor-pointer",
      ])}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        <div className="flex-shrink-0">
          <pre className="text-xs text-gray-500 whitespace-pre-wrap">{status}</pre>
        </div>
      </div>
    </div>
  );
}

function ProviderCard({
  name,
  configured,
  modelInUse,
}: {
  name: string;
  configured?: boolean;
  modelInUse?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cn([
        "border rounded-lg transition-all cursor-pointer",
        isOpen
          ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50/30"
          : "border-gray-200 bg-white hover:border-gray-300",
      ])}
    >
      <div className="p-4" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-900">{name}</span>
            {configured && (
              <span className="text-xs text-green-700 flex items-center gap-1">
                <span>✓</span>
                <span>API key configured</span>
              </span>
            )}
          </div>
          <span className="text-gray-400 text-xl font-light">{isOpen ? "−" : "+"}</span>
        </div>
        {modelInUse && (
          <p className="text-xs text-gray-500 mt-2">
            Model being used: <span className="font-mono text-gray-700">{modelInUse}</span>
          </p>
        )}
      </div>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-200 mt-2">
          <div className="mt-4">
            <Input
              placeholder={`Paste your API key for ${name}`}
              type="password"
              className="placeholder:text-gray-400"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
