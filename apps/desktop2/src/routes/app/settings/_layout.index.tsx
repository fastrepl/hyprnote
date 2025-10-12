import { commands as windowsCommands } from "@hypr/plugin-windows/v1";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";
import { cn } from "@hypr/ui/lib/utils";
import { useAuth } from "../../../auth";
import { useValidatedRow } from "../../../hooks/useValidatedRow";
import * as persisted from "../../../store/tinybase/persisted";

export const Route = createFileRoute("/app/settings/_layout/")({
  component: Component,
});

function Component() {
  const search = Route.useSearch();

  return (
    <>
      {search.tab === "general" && <SettingsGeneral />}
      {search.tab === "calendar" && <SettingsCalendar />}
      {search.tab === "ai" && <SettingsAI />}
      {search.tab === "notifications" && <SettingsNotifications />}
      {search.tab === "integrations" && <SettingsIntegrations />}
      {search.tab === "templates" && <SettingsTemplates />}
      {search.tab === "feedback" && <SettingsFeedback />}
      {search.tab === "developers" && <SettingsDevelopers />}
      {search.tab === "billing" && <SettingsBilling />}
    </>
  );
}

function SettingsGeneral() {
  const res = persisted.useConfig();
  if (!res) {
    return null;
  }
  const { id, config } = res;

  const parsedConfig = persisted.configSchema.parse(config);

  const handleUpdate = persisted.UI.useSetRowCallback(
    "configs",
    id,
    (row: persisted.Config) => ({
      ...row,
      spoken_languages: JSON.stringify(row.spoken_languages),
      jargons: JSON.stringify(row.jargons),
      notification_ignored_platforms: row.notification_ignored_platforms
        ? JSON.stringify(row.notification_ignored_platforms)
        : undefined,
    }),
    [id],
    persisted.STORE_ID,
  );

  const r = useValidatedRow(persisted.configSchema, parsedConfig, handleUpdate);

  return (
    <div>
      <pre>{JSON.stringify(config, null, 2)}</pre>
      <input
        type="checkbox"
        onChange={(e) => r.setField("save_recordings", e.target.checked)}
      />
    </div>
  );
}

function SettingsCalendar() {
  return null;
}

function SettingsAI() {
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
  return (
    <div className="space-y-8">
      <Section title="On-device models" description="Local transcription models">
        <ModelCard
          name="Parakeet-2"
          description="For English-only conversations"
          status="downloaded"
        />
        <ModelCard
          name="Parakeet-3"
          description="For European languages"
          status="available"
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
  status: "available" | "downloaded";
}) {
  return (
    <div
      className={cn([
        "p-4 rounded-lg border-2 transition-all cursor-pointer",
        status === "downloaded"
          ? "border-blue-500 bg-blue-50/50"
          : "border-dashed border-gray-200 bg-white hover:border-gray-300",
      ])}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        <div className="flex-shrink-0">
          {status === "downloaded"
            ? (
              <span className="text-xs font-medium text-blue-600 bg-blue-100 px-3 py-1.5 rounded">
                Model Downloaded
              </span>
            )
            : (
              <Button size="sm" variant="outline" className="text-xs">
                Download Model
              </Button>
            )}
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

function SettingsNotifications() {
  return null;
}

function SettingsIntegrations() {
  return null;
}

function SettingsTemplates() {
  return null;
}

function SettingsFeedback() {
  return null;
}

function SettingsDevelopers() {
  const s = useAuth();

  const handleAuth = () => windowsCommands.windowShow({ type: "auth" });

  return (
    <div>
      <pre>{JSON.stringify(s?.session)}</pre>
      <button onClick={handleAuth}>Auth</button>
    </div>
  );
}

function SettingsBilling() {
  return null;
}
